"""Run from backend: ../.venv/bin/python ../evaluation/run.py [--provider real]."""
import argparse
import json
import sys
import tempfile
import time
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from app import core
from app.core import Base, save
from app.ingestion import index_file
from app.providers import provider
from app.retrieval import retrieve, validate_assessment

parser=argparse.ArgumentParser()
parser.add_argument('--provider',choices=['demo','real'],default='demo')
parser.add_argument('--split',choices=['dev','validation','holdout','all'],default='holdout')
args=parser.parse_args()
cases=json.loads(Path(__file__).with_name('cases.json').read_text())
results=[]
start=time.perf_counter()
with tempfile.TemporaryDirectory() as tmp:
    engine=create_engine(f'sqlite:///{tmp}/evaluation.db')
    core.Session=sessionmaker(engine,expire_on_commit=False)
    Base.metadata.create_all(engine)
    for case in cases:
        if args.split!='all' and case['split']!=args.split:continue
        p=save('project',{'url':''})
        s=save('snapshot',{'project_id':p['id'],'sha':'f'*40,'demo':True})
        for path,text in {**case['sources'],'distractor.md':'Recipe collection: flour, water and salt.'}.items():
            index_file(s['id'],path,text)
        chunks=retrieve(case['requirement']['text'],[s['id']],k=5)
        prov=provider(args.provider)
        t=time.perf_counter()
        raw=prov.assess_requirements(case['requirement'],chunks)
        checked=validate_assessment(raw,chunks,[s['id']],case['requirement'])
        results.append({'id':case['id'],'expected':case['expected_status'],'actual':checked['status'],'relevant_retrieved':bool(set(case['relevant_paths']) & {c['path'] for c in chunks}) if case['relevant_paths'] else None,'valid_citations':len(checked['evidence']),'invalid_citations':len(checked['invalid_citations']),'seconds':time.perf_counter()-t,'usage':prov.usage})
    engine.dispose()
statuses=['supported','partial','not_evidenced','not_verifiable_from_code']
matrix={s:{t:sum(r['expected']==s and r['actual']==t for r in results) for t in statuses} for s in statuses}
eligible=[r for r in results if r['relevant_retrieved'] is not None]
valid=sum(r['valid_citations'] for r in results)
invalid=sum(r['invalid_citations'] for r in results)
report={'provider':args.provider,'split':args.split,'cases':len(results),'interpretation':'Deterministic pipeline regression only; NOT LLM quality.' if args.provider=='demo' else 'Small hand-authored synthetic benchmark; not a general accuracy estimate.','retrieval_hit_at_5':{'hits':sum(r['relevant_retrieved'] for r in eligible),'eligible_cases':len(eligible)},'citation_validity':{'valid':valid,'total':valid+invalid},'confusion_expected_rows_predicted_columns':matrix,'false_supported':sum(r['actual']=='supported' and r['expected']!='supported' for r in results),'total_seconds':time.perf_counter()-start,'results':results}
path=Path(__file__).with_name(f'results-{args.provider}-{args.split}.json')
path.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='results'},indent=2))
