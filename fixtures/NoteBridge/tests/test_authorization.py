def test_other_owner_cannot_read(client, other_user):
    response = client.get("/notes/1", headers=other_user.headers)
    assert response.status_code == 403
