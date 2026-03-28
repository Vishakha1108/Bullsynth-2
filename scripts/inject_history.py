import json
import random

def generate_price_history(base_value, periods=20):
    try:
        # Clean value string (remove commas and currency symbols)
        clean_val = base_value.replace('$', '').replace(',', '')
        base = float(clean_val)
    except:
        base = 100.0
        
    history = []
    current = base * 0.95 # Start a bit lower
    for i in range(periods):
        hour = (9 + (i // 2)) % 24
        minute = "00" if i % 2 == 0 else "30"
        time_label = f"{hour:02d}:{minute}"
        
        # Random walk
        change = random.uniform(-0.01, 0.015)
        current = current * (1 + change)
        history.append({
            "time": time_label,
            "price": round(current, 2)
        })
    return history

with open('c:/Users/ASUS/OneDrive/Desktop/Synthetic-Bull-Frontend/src/Data/mockData.json', 'r') as f:
    data = json.load(f)

for bot in data['bots']:
    for asset in bot['assets']:
        asset['priceHistory'] = generate_price_history(asset['value'])

with open('c:/Users/ASUS/OneDrive/Desktop/Synthetic-Bull-Frontend/src/Data/mockData.json', 'w') as f:
    json.dump(data, f, indent=2)
