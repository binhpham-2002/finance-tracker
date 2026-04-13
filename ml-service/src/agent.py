import anthropic
import json
import requests
from dotenv import load_dotenv
import os

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

API_BASE = "http://localhost:3000/api"

tools = [
    {
        "name": "get_spending_summary",
        "description": "Get the user's monthly spending summary including income, expenses, and spending by category for a specific month and year.",
        "input_schema": {
            "type": "object",
            "properties": {
                "month": {"type": "integer", "description": "Month number (1-12)"},
                "year": {"type": "integer", "description": "Year (e.g. 2026)"},
            },
            "required": ["month", "year"],
        },
    },
    {
        "name": "get_transactions",
        "description": "Get the user's recent transactions. Can filter by type (INCOME, EXPENSE, TRANSFER).",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Number of transactions to return", "default": 20},
                "type": {"type": "string", "enum": ["INCOME", "EXPENSE", "TRANSFER"], "description": "Filter by transaction type"},
            },
        },
    },
    {
        "name": "set_budget",
        "description": "Set a monthly budget for a specific spending category. Use this when you want to help the user control spending.",
        "input_schema": {
            "type": "object",
            "properties": {
                "category_id": {"type": "string", "description": "The category UUID"},
                "amount": {"type": "number", "description": "Budget amount in dollars"},
                "month": {"type": "integer", "description": "Month number (1-12)"},
                "year": {"type": "integer", "description": "Year"},
            },
            "required": ["category_id", "amount", "month", "year"],
        },
    },
    {
        "name": "get_spending_patterns",
        "description": "Get ML-analyzed spending patterns showing which categories the user spends most on and percentages.",
        "input_schema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "get_categories",
        "description": "Get all available spending categories with their IDs, names, and icons.",
        "input_schema": {
            "type": "object",
            "properties": {},
        },
    },
]


def execute_tool(tool_name, tool_input, token, user_id):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    if tool_name == "get_spending_summary":
        r = requests.get(
            f"{API_BASE}/transactions/summary",
            params={"month": tool_input["month"], "year": tool_input["year"]},
            headers=headers,
        )
        return r.json()

    elif tool_name == "get_transactions":
        params = {"limit": tool_input.get("limit", 20)}
        if "type" in tool_input:
            params["type"] = tool_input["type"]
        r = requests.get(f"{API_BASE}/transactions", params=params, headers=headers)
        return r.json()

    elif tool_name == "set_budget":
        r = requests.post(
            f"{API_BASE}/budgets",
            json={
                "categoryId": tool_input["category_id"],
                "amount": tool_input["amount"],
                "month": tool_input["month"],
                "year": tool_input["year"],
            },
            headers=headers,
        )
        return r.json()

    elif tool_name == "get_spending_patterns":
        r = requests.get(f"http://localhost:8000/api/ml/spending-patterns/{user_id}")
        return r.json()

    elif tool_name == "get_categories":
        r = requests.get(f"{API_BASE}/accounts/categories", headers=headers)
        return r.json()

    return {"error": "Unknown tool"}


def run_agent(user_goal, token, user_id):
    print(f"\n{'='*50}")
    print(f"Agent Goal: {user_goal}")
    print(f"{'='*50}")

    messages = [
        {
            "role": "user",
            "content": f"""You are a personal finance AI agent. The user wants: "{user_goal}"

You have access to tools to analyze their spending, view transactions, check patterns, and set budgets.

Steps:
1. First understand their current financial situation by checking spending summary and patterns
2. Analyze the data
3. Take actions (like setting budgets) if appropriate
4. Provide a clear action plan

Today's date is 2026-04-12. Always use month=4, year=2026 for current month queries.
Be specific with dollar amounts. Take action, don't just suggest.""",
        }
    ]

    max_steps = 8
    step = 0

    while step < max_steps:
        step += 1
        print(f"\n--- Step {step} ---")

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            tools=tools,
            messages=messages,
        )

        # Collect all tool uses
        tool_uses = [b for b in response.content if b.type == "tool_use"]
        text_blocks = [b for b in response.content if b.type == "text"]

        for block in text_blocks:
            print(f"Agent says: {block.text[:200]}...")

        if not tool_uses:
            # No tools called - agent is done
            final_text = ""
            for block in text_blocks:
                final_text += block.text
            print(f"\n{'='*50}")
            print("Agent complete!")
            return final_text

        # Handle all tool calls
        messages.append({"role": "assistant", "content": response.content})

        tool_results = []
        for block in tool_uses:
            print(f"Agent calls: {block.name}({json.dumps(block.input)[:100]})")
            result = execute_tool(block.name, block.input, token, user_id)
            print(f"Result: {json.dumps(result)[:150]}...")
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": json.dumps(result),
            })

        messages.append({"role": "user", "content": tool_results})

    return "Agent reached maximum steps."