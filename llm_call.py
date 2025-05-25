from groq import Groq
import sys
import os

# Use environment variable name here
api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    raise ValueError("GROQ_API_KEY environment variable is not set")

client = Groq(api_key=api_key)

prompt = sys.argv[1] if len(sys.argv) > 1 else "hi"

completion = client.chat.completions.create(
    model="llama3-70b-8192",
    messages=[{"role": "user", "content": prompt}],
    temperature=1,
    max_completion_tokens=1024,
    top_p=1,
    stream=False,  # Stream off for simpler output
)

print(completion.choices[0].message.content)
