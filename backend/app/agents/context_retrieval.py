import logging
from datetime import datetime
from typing import Dict, Any, List

from langchain_core.messages import HumanMessage, ToolMessage
from langgraph.prebuilt import create_react_agent

from app.agents.state import DynamicRCAState
from app.agents.llm import get_chat_model
from app.tools.data_adapters import search_knowledge_base

logger = logging.getLogger(__name__)

TOOLS = [search_knowledge_base]


def context_retrieval_node(state: DynamicRCAState) -> Dict[str, Any]:
    """
    Node 2: Context Retrieval Agent
    Equipped with `search_knowledge_base`.
    Synthesizes the search query from symptoms, stage, and error codes,
    executes vector search against SOPs/KBs, and logs its tool invocation.
    """
    stage = state.get("process_stage", "Acumax")
    symptoms = state.get("extracted_symptoms", [])
    errors = state.get("error_signatures", [])
    ticket_data = state.get("ticket_data", {})
    short_desc = ticket_data.get("short_description", "")
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    agent_logs = list(state.get("agent_logs", []))

    # Formulate dense search query
    query_parts = [stage, short_desc]
    if symptoms:
        query_parts.append(symptoms[0])
    if errors:
        query_parts.extend(errors[:2])
    search_query = " ".join([p for p in query_parts if p]).strip()

    logger.info(f"[ContextRetrievalAgent] Formulated search query: '{search_query}'")

    retrieved_kbs = []
    tool_steps_recorded = []

    model = get_chat_model()
    if model:
        try:
            react_agent = create_react_agent(
                model=model,
                tools=TOOLS,
                prompt=(
                    "You are the Context Retrieval Agent for McKesson Distribution Operations. "
                    "Your job is to search the Standard Operating Procedures (SOP) and Knowledge Base "
                    "using the tool search_knowledge_base with the given query."
                )
            )
            react_input = {
                "messages": [
                    HumanMessage(content=f"Please search for knowledge base articles and SOPs related to: {search_query}")
                ]
            }
            res = react_agent.invoke(react_input)
            msgs = res.get("messages", [])
            for msg in msgs:
                if isinstance(msg, ToolMessage):
                    tool_steps_recorded.append({
                        "tool": msg.name,
                        "output_preview": str(msg.content)[:200]
                    })
                    if msg.name == "search_knowledge_base" and isinstance(msg.content, list):
                        retrieved_kbs = msg.content
        except Exception as e:
            logger.warning(f"[ContextRetrievalAgent] LLM ReAct loop failed: {e}. Falling back to adapter execution.")

    # Deterministic Tool Execution Fallback
    if not retrieved_kbs:
        logger.info(f"[ContextRetrievalAgent] Calling search_knowledge_base directly with query: '{search_query}'")
        res = search_knowledge_base.invoke({"query": search_query})
        retrieved_kbs = res if isinstance(res, list) else []
        tool_steps_recorded.append({
            "tool": "search_knowledge_base",
            "args": {"query": search_query},
            "retrieved_count": len(retrieved_kbs),
            "status": "SUCCESS"
        })

    agent_step = {
        "agent_name": "Context Retrieval Agent",
        "timestamp": now_str,
        "status": "COMPLETED",
        "summary": f"Executed vector search for stage '{stage}'. Retrieved {len(retrieved_kbs)} relevant SOP/KB articles.",
        "details": {
            "query_used": search_query,
            "retrieved_count": len(retrieved_kbs),
            "tool_calls": tool_steps_recorded
        }
    }
    agent_logs.append(agent_step)

    return {
        "search_query_used": search_query,
        "retrieved_kbs": retrieved_kbs,
        "retrieved_context": retrieved_kbs,
        "agent_logs": agent_logs
    }
