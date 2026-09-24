type Note = { id: number; title: string };
export function Notes({ notes }: { notes: Note[] }) {
  return <ul>{notes.map(note => <li key={note.id}>{note.title}</li>)}</ul>;
}
