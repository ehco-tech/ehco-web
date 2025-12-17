"""
Quick test script to verify DeepSeek API is working properly
"""

import asyncio
from setup_firebase_deepseek import NewsManager
import json


async def test_deepseek_api():
    """Test if DeepSeek API is responding correctly"""

    print("Initializing NewsManager...")
    manager = NewsManager()

    print("\n" + "="*60)
    print("Testing DeepSeek API")
    print("="*60)

    # Simple test prompt
    test_prompt = """
    Given the following list of public figure names and the article text below,
    identify which of these public figures are mentioned in the article.

    Public Figure Names:
    BTS, BLACKPINK, IU, NewJeans, Seventeen

    Article Text:
    BTS released a new album today. The group's leader RM spoke about the creative process.
    IU also announced her upcoming concert tour.

    Return ONLY a JSON array of strings with the names mentioned.
    Example: ["BTS", "IU"]
    """

    # Test multiple models
    models_to_test = [
        manager.model,  # deepseek-reasoner
        "deepseek-chat",  # Alternative model
    ]

    for test_model in models_to_test:
        try:
            print(f"\n{'='*60}")
            print(f"Testing model: {test_model}")
            print('='*60)

            response = await manager.client.chat.completions.create(
                model=test_model,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": test_prompt}
                ],
                temperature=0.2,
                max_tokens=100
            )

            print("\n✓ Response received!")
            print("\nResponse details:")
            print(f"  - ID: {response.id}")
            print(f"  - Model: {response.model}")
            print(f"  - Choices: {len(response.choices)}")

            if response.choices:
                content = response.choices[0].message.content
                print(f"\n  Content: {content}")
                print(f"  Content length: {len(content) if content else 0}")

                # Try to parse as JSON
                if content:
                    try:
                        parsed = json.loads(content)
                        print(f"  ✓ Valid JSON: {parsed}")
                        print(f"  ✓✓✓ MODEL '{test_model}' WORKS! ✓✓✓")
                        break  # Found a working model, stop testing
                    except json.JSONDecodeError:
                        print(f"  ⚠ Not valid JSON, trying to extract...")
                        import re
                        json_match = re.search(r"\[.*\]", content, re.DOTALL)
                        if json_match:
                            try:
                                parsed = json.loads(json_match.group(0))
                                print(f"  ✓ Extracted JSON: {parsed}")
                                print(f"  ✓✓✓ MODEL '{test_model}' WORKS! ✓✓✓")
                                break  # Found a working model
                            except:
                                print(f"  ✗ Could not extract valid JSON")
                else:
                    print("  ✗ Empty content - trying next model...")
            else:
                print("  ✗ No choices in response - trying next model...")

        except Exception as e:
            print(f"\n✗ Error with model '{test_model}': {e}")
            print("  Trying next model...")
            continue

    print("\n" + "="*60)
    print("TEST COMPLETE")
    print("="*60)

    await manager.close()


if __name__ == "__main__":
    asyncio.run(test_deepseek_api())
