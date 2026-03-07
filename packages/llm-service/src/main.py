import logfire
from fastapi import FastAPI

from src.router import router

logfire.configure(service_name="editengage-llm")

app = FastAPI(title="EditEngage LLM Service")
logfire.instrument_fastapi(app)
app.include_router(router)

with logfire.span("llm_service.startup"):
    logfire.info("LLM service initialized")


@app.get("/health")
async def health():
    return {"status": "ok"}
