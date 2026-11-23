"""Test fixtures: a throw-away SQLite file and the demo tenant, seeded once."""
import os
import tempfile
from pathlib import Path

_tmp = tempfile.mkdtemp(prefix="coresite-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_tmp, 'test.db').as_posix()}"
os.environ["APP_ENV"] = "development"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app import rate_limit  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app, base_url="http://localhost") as test_client:  # lifespan: tables + seed
        yield test_client


@pytest.fixture(autouse=True)
def _clean_rate_limits():
    rate_limit._reset_for_tests()
    yield
