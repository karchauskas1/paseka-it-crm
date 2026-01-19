#!/usr/bin/env python3
import re

# Read the file
with open('lib/ai.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to match: client.messages.create({ model: '...', max_tokens: N, messages: [...] })
# and replace with: callOpenRouter(messages, max_tokens)

def replace_anthropic_call(match):
    full_match = match.group(0)

    # Extract max_tokens
    max_tokens_match = re.search(r'max_tokens:\s*(\d+)', full_match)
    max_tokens = max_tokens_match.group(1) if max_tokens_match else '500'

    # Extract messages array
    messages_match = re.search(r'messages:\s*(\[[\s\S]*?\])\s*(?:,|\})', full_match)
    if not messages_match:
        return full_match  # Can't parse, leave as is

    messages = messages_match.group(1)

    # Replace the whole call
    return f'const content = await callOpenRouter({messages}, {max_tokens})'

# Pattern: const response = await client.messages.create({...})
pattern = r'const response = await client\.messages\.create\(\{[\s\S]*?\}\)'
content = re.sub(pattern, replace_anthropic_call, content)

# Now handle the response processing patterns
# Pattern: const content = response.content[0]
#          if (content.type === 'text') { return content.text }
content = re.sub(
    r'const content = response\.content\[0\]\s*\n\s*if \(content\.type === [\'"]text[\'"]\) \{\s*\n\s*return content\.text\s*\n\s*\}',
    'return content',
    content
)

# Pattern: const content = response.content[0]
#          if (content.type !== 'text') { throw ... }
# Just remove these checks since callOpenRouter returns string directly
content = re.sub(
    r'const content = response\.content\[0\]\s*\n\s*if \(content\.type !== [\'"]text[\'"]\) \{[\s\S]*?\}',
    '',
    content
)

# Write back
with open('lib/ai.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed ai.ts - replaced all Anthropic SDK calls with callOpenRouter")
