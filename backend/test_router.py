import asyncio
import sys

# Ensure UTF-8 output on Windows console
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from app.agents.graph import stream_rca_workflow

async def main():
    print("Testing Multi-Provider Fallback Stream with Live Groq...")
    count = 0
    async for ev in stream_rca_workflow("INC0892110"):
        count += 1
        ev_type = ev.get("type")
        agent = ev.get("agent")
        msg = ev.get("message", "")
        if ev_type == "complete":
            rca = ev.get("rca_payload", {})
            print(f"[{count}] COMPLETE: Root cause -> {rca.get('root_cause_summary', '')[:65]} (Confidence: {rca.get('confidence_score')}%)")
        else:
            print(f"[{count}] {ev_type} | Agent: {agent} | Msg: {msg[:80]}")

if __name__ == "__main__":
    asyncio.run(main())
