# Next Steps

## Where we left off
The foundation is built and running. The API is live locally and the repo is on GitHub.

## To run locally
```
cd "Root Directory"
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```
Then open http://localhost:8000/docs

## To run tests
```
pytest
```

## Immediate next steps
- [ ] Transfer repo to work GitHub account
- [ ] Add GitHub Actions CI (run tests automatically on every push)
- [ ] Build a front end to replace the Tkinter UI
- [ ] Add authentication middleware so credentials aren't passed per request

## Longer term
- [ ] Lock down test coverage thresholds
- [ ] Get it deployed with the team's help (Kubernetes)
- [ ] Document the API properly for other team members