import json

with open('/home/mappo/.gemini/antigravity/brain/d1638a37-3ab3-4fab-b35b-aad7a44b6c86/.system_generated/logs/transcript.jsonl', 'r') as f:
    for line in f:
        data = json.loads(line)
        if data.get('type') == 'USER_INPUT' and 'Opción B' in data.get('content', ''):
            content = data['content']
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if 'Paso 5' in line:
                    print('\n'.join(lines[max(0, i-2):min(len(lines), i+80)]))
                    break
