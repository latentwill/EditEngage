"""
User behavior: When ops deploys the stack, the LLM service starts and is reachable
Business rule: LLM service must be health-checkable and accessible internally
"""
import yaml
import os


def test_docker_compose_has_llm_service():
    compose_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'docker-compose.yml')
    with open(compose_path) as f:
        config = yaml.safe_load(f)
    assert 'llm-service' in config['services']


def test_llm_service_has_health_check():
    compose_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'docker-compose.yml')
    with open(compose_path) as f:
        config = yaml.safe_load(f)
    svc = config['services']['llm-service']
    assert 'healthcheck' in svc


def test_llm_service_has_logfire_token():
    compose_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'docker-compose.yml')
    with open(compose_path) as f:
        config = yaml.safe_load(f)
    svc = config['services']['llm-service']
    env_list = svc.get('environment', [])
    env_str = str(env_list)
    assert 'LOGFIRE_TOKEN' in env_str


def test_llm_service_not_exposed_externally():
    compose_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'docker-compose.yml')
    with open(compose_path) as f:
        config = yaml.safe_load(f)
    svc = config['services']['llm-service']
    assert 'ports' not in svc  # internal only
    assert 'expose' in svc


def test_dockerfile_exists():
    dockerfile_path = os.path.join(os.path.dirname(__file__), '..', 'Dockerfile')
    assert os.path.exists(dockerfile_path)
