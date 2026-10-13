import os
import logging
from typing import Optional, Any, List, Dict, Tuple, Callable
from app.config import settings

logger = logging.getLogger(__name__)


class AllLLMProvidersExhausted(Exception):
    """Raised when every configured LLM provider in the pool has failed or no providers are configured."""
    pass


# Global tracking of active / last used provider
_LAST_USED_PROVIDER: Dict[str, str] = {
    "name": "Deterministic Engine",
    "model": "rule-based"
}


def get_last_used_provider_info() -> Dict[str, str]:
    return dict(_LAST_USED_PROVIDER)


def _set_active_provider(name: str, model: str):
    _LAST_USED_PROVIDER["name"] = name
    _LAST_USED_PROVIDER["model"] = model


# ---------------------------------------------------------------------------
# Individual Provider Factories
# ---------------------------------------------------------------------------

def get_groq_llm(temperature: float = 0.1) -> Optional[Any]:
    key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")
    if key and key.strip():
        try:
            from langchain_groq import ChatGroq
            model_name = settings.GROQ_MODEL or "llama-3.3-70b-versatile"
            return ChatGroq(
                model_name=model_name,
                temperature=temperature,
                groq_api_key=key.strip()
            )
        except Exception as e:
            logger.warning(f"[LLM Factory] Failed to initialize Groq provider: {e}")
            return None
    return None


def get_anthropic_llm(temperature: float = 0.1) -> Optional[Any]:
    key = settings.ANTHROPIC_API_KEY or os.getenv("ANTHROPIC_API_KEY", "")
    if key and key.strip():
        try:
            from langchain_anthropic import ChatAnthropic
            model_name = settings.ANTHROPIC_MODEL or "claude-3-5-sonnet-20241022"
            return ChatAnthropic(
                model_name=model_name,
                temperature=temperature,
                api_key=key.strip()
            )
        except Exception as e:
            logger.warning(f"[LLM Factory] Failed to initialize Anthropic provider: {e}")
            return None
    return None


def get_openai_llm(temperature: float = 0.1) -> Optional[Any]:
    key = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY", "")
    if key and key.strip():
        try:
            from langchain_openai import ChatOpenAI
            model_name = settings.OPENAI_MODEL or "gpt-4o-mini"
            return ChatOpenAI(
                model=model_name,
                temperature=temperature,
                api_key=key.strip()
            )
        except Exception as e:
            logger.warning(f"[LLM Factory] Failed to initialize OpenAI provider: {e}")
            return None
    return None


def get_ollama_llm(temperature: float = 0.1) -> Optional[Any]:
    base_url = settings.OLLAMA_BASE_URL or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    model_name = settings.OLLAMA_MODEL or os.getenv("OLLAMA_MODEL", "llama3.1")
    # Only initialize Ollama if explicitly in order list or environment variable set
    try:
        from langchain_ollama import ChatOllama
        return ChatOllama(
            base_url=base_url,
            model=model_name,
            temperature=temperature
        )
    except Exception as e:
        logger.debug(f"[LLM Factory] Ollama not available: {e}")
        return None


PROVIDER_FACTORIES: Dict[str, Tuple[Callable[[float], Optional[Any]], str]] = {
    "groq": (get_groq_llm, settings.GROQ_MODEL),
    "anthropic": (get_anthropic_llm, settings.ANTHROPIC_MODEL),
    "openai": (get_openai_llm, settings.OPENAI_MODEL),
    "ollama": (get_ollama_llm, settings.OLLAMA_MODEL),
}


# ---------------------------------------------------------------------------
# Resilient LLM Router Class
# ---------------------------------------------------------------------------

class ResilientLLM:
    """
    Enterprise-grade Multi-Provider LLM Fallback Router.
    Cycles through configured providers (Groq -> Anthropic -> OpenAI -> Ollama).
    Automatically intercepts 429 quota exhaustion, 401 auth errors, and connection
    timeouts, failovering to the next available provider.
    """
    def __init__(self, temperature: float = 0.1):
        self.temperature = temperature
        self._provider_order = settings.provider_order_list
        self._models: List[Tuple[str, str, Any]] = []
        self._init_models()

    def _init_models(self):
        self._models = []
        for provider in self._provider_order:
            if provider in PROVIDER_FACTORIES:
                factory, default_model = PROVIDER_FACTORIES[provider]
                instance = factory(self.temperature)
                if instance is not None:
                    self._models.append((provider, default_model, instance))

    @property
    def has_active_providers(self) -> bool:
        return len(self._models) > 0

    @property
    def candidate_count(self) -> int:
        return len(self._models)

    def bind_tools(self, tools: List[Any], **kwargs) -> "ResilientBoundTools":
        bound_candidates = []
        for name, model_name, model in self._models:
            try:
                bound = model.bind_tools(tools, **kwargs)
                bound_candidates.append((name, model_name, bound))
            except Exception as e:
                logger.warning(f"[ResilientLLM] Provider '{name}' failed to bind tools: {e}")
        return ResilientBoundTools(bound_candidates)

    def with_structured_output(self, schema: Any, **kwargs) -> "ResilientStructuredOutput":
        structured_candidates = []
        for name, model_name, model in self._models:
            try:
                structured = model.with_structured_output(schema, **kwargs)
                structured_candidates.append((name, model_name, structured))
            except Exception as e:
                logger.warning(f"[ResilientLLM] Provider '{name}' failed with_structured_output: {e}")
        return ResilientStructuredOutput(structured_candidates)

    def invoke(self, messages: Any, **kwargs) -> Any:
        if not self._models:
            raise AllLLMProvidersExhausted("No live LLM providers configured in pool.")

        for name, model_name, model in self._models:
            try:
                logger.info(f"[LLM Router] Invoking provider: {name} ({model_name})")
                res = model.invoke(messages, **kwargs)
                _set_active_provider(name, model_name)
                return res
            except Exception as exc:
                err_text = str(exc).lower()
                logger.warning(
                    f"[LLM Router] Provider '{name}' ({model_name}) failed with error: {exc}. "
                    "Cycling to next available provider in pool..."
                )
                continue

        raise AllLLMProvidersExhausted("All configured LLM providers in pool failed or exhausted quota.")

    async def ainvoke(self, messages: Any, **kwargs) -> Any:
        if not self._models:
            raise AllLLMProvidersExhausted("No live LLM providers configured in pool.")

        for name, model_name, model in self._models:
            try:
                logger.info(f"[LLM Router] ainvoking provider: {name} ({model_name})")
                if hasattr(model, "ainvoke"):
                    res = await model.ainvoke(messages, **kwargs)
                else:
                    res = model.invoke(messages, **kwargs)
                _set_active_provider(name, model_name)
                return res
            except Exception as exc:
                logger.warning(
                    f"[LLM Router] Provider '{name}' ({model_name}) async call failed: {exc}. "
                    "Cycling to next candidate in pool..."
                )
                continue

        raise AllLLMProvidersExhausted("All configured LLM providers in pool failed or exhausted quota.")


class ResilientBoundTools:
    """Wrapper around tool-bound providers with automated fallback failover."""
    def __init__(self, bound_models: List[Tuple[str, str, Any]]):
        self._bound_models = bound_models

    def invoke(self, messages: Any, **kwargs) -> Any:
        if not self._bound_models:
            raise AllLLMProvidersExhausted("No tool-bound LLM providers available.")

        for name, model_name, bound_model in self._bound_models:
            try:
                logger.info(f"[LLM Router] Invoking tool-bound provider: {name} ({model_name})")
                res = bound_model.invoke(messages, **kwargs)
                _set_active_provider(name, model_name)
                return res
            except Exception as exc:
                logger.warning(
                    f"[LLM Router] Tool-bound provider '{name}' failed: {exc}. "
                    "Cycling to next candidate..."
                )
                continue

        raise AllLLMProvidersExhausted("All tool-bound LLM providers failed.")

    async def ainvoke(self, messages: Any, **kwargs) -> Any:
        if not self._bound_models:
            raise AllLLMProvidersExhausted("No tool-bound LLM providers available.")

        for name, model_name, bound_model in self._bound_models:
            try:
                logger.info(f"[LLM Router] ainvoking tool-bound provider: {name} ({model_name})")
                if hasattr(bound_model, "ainvoke"):
                    res = await bound_model.ainvoke(messages, **kwargs)
                else:
                    res = bound_model.invoke(messages, **kwargs)
                _set_active_provider(name, model_name)
                return res
            except Exception as exc:
                logger.warning(
                    f"[LLM Router] Tool-bound provider '{name}' async call failed: {exc}. "
                    "Cycling to next candidate..."
                )
                continue

        raise AllLLMProvidersExhausted("All tool-bound LLM providers failed.")


class ResilientStructuredOutput:
    """Wrapper around structured-output providers with automated fallback failover."""
    def __init__(self, structured_models: List[Tuple[str, str, Any]]):
        self._structured_models = structured_models

    def invoke(self, messages: Any, **kwargs) -> Any:
        if not self._structured_models:
            raise AllLLMProvidersExhausted("No structured-output LLM providers available.")

        for name, model_name, model in self._structured_models:
            try:
                logger.info(f"[LLM Router] Invoking structured output provider: {name} ({model_name})")
                res = model.invoke(messages, **kwargs)
                _set_active_provider(name, model_name)
                return res
            except Exception as exc:
                logger.warning(
                    f"[LLM Router] Structured output provider '{name}' failed: {exc}. "
                    "Cycling to next candidate..."
                )
                continue

        raise AllLLMProvidersExhausted("All structured-output LLM providers failed.")


def get_resilient_llm(temperature: float = 0.1) -> ResilientLLM:
    """Returns the multi-provider fallback router."""
    return ResilientLLM(temperature=temperature)


def get_chat_model(temperature: float = 0.0) -> Optional[ResilientLLM]:
    """
    Backwards-compatible accessor. Returns ResilientLLM router if any providers are configured,
    or None if no providers are available.
    """
    router = ResilientLLM(temperature=temperature)
    if router.has_active_providers:
        return router
    return None
