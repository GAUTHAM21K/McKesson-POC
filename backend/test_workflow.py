import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.rag.ingestion import ingest_knowledge_base, get_incident_by_id
from app.rag.vector_store import KnowledgeVectorStore
from app.agents.graph import run_rca_workflow

def test_pipeline():
    print("Testing Ingestion...")
    ingest_res = ingest_knowledge_base()
    print(f"Ingestion result: {ingest_res}")
    
    store = KnowledgeVectorStore.get_instance()
    print(f"Vector store indexed docs: {len(store.documents)}")
    
    # Test query
    docs = store.query("WAVE_HDR_DTL deadlock ORA-00054", top_k=2)
    print(f"Retrieved {len(docs)} documents for query:")
    for d in docs:
        print(f"  - [{d.get('id')}] {d.get('title')} (score: {d.get('score')})")

    # Test Incident Load
    incident = get_incident_by_id("INC0892110")
    print(f"\nLoaded Incident: {incident['number']} - {incident['short_description']}")
    
    # Test LangGraph Multi-Agent Workflow Execution
    print("\nExecuting LangGraph Multi-Agent Workflow...")
    rca = run_rca_workflow(incident)
    print(f"\nFinal RCA Output:")
    print(f"  Incident: {rca.get('incident_number')}")
    print(f"  Stage: {rca.get('process_stage')}")
    print(f"  Confidence: {rca.get('confidence_score')}%")
    print(f"  Root Cause Summary: {rca.get('root_cause_summary')}")
    print(f"  Predicted Owner: {rca.get('predicted_assignment_group')} ({rca.get('assignment_group_confidence')}%)")
    print(f"  Evidence items: {len(rca.get('evidence_used', []))}")
    print(f"  Contradictions: {len(rca.get('contradictions', []))}")
    print(f"  Remediation steps: {len(rca.get('remediation_plan', []))}")
    print(f"  Agent Reasoning Nodes: {len(rca.get('agent_reasoning_trail', []))}")
    print("\nTest passed successfully!")

if __name__ == "__main__":
    test_pipeline()
