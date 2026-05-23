from flask import Flask, request, jsonify, send_from_directory
import json
import os
from datetime import datetime

app = Flask(__name__, static_folder='.', static_url_path='')

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data.json')

DEFAULT_DATA = {
    "sharedPoints": 100,
    "blindBox": {
        "drawCost": 10,
        "dailyReward": 20,
        "lastDailyDate": None,
        "gifts": [
            {"id": 1, "name": "能量金币", "emoji": "🪙", "rarity": "common", "probability": 40},
            {"id": 2, "name": "光之水晶", "emoji": "💎", "rarity": "common", "probability": 25},
            {"id": 3, "name": "怪兽卡片", "emoji": "🃏", "rarity": "rare", "probability": 15},
            {"id": 4, "name": "等离子火花", "emoji": "⚡", "rarity": "rare", "probability": 10},
            {"id": 5, "name": "奥特勋章", "emoji": "🏅", "rarity": "epic", "probability": 6},
            {"id": 6, "name": "变身器碎片", "emoji": "🌟", "rarity": "epic", "probability": 3},
            {"id": 7, "name": "M78星云宝石", "emoji": "🔮", "rarity": "legendary", "probability": 1},
        ],
        "history": []
    },
    "tracker": {
        "goals": [
            {"id": 1, "name": "阅读30分钟", "points": 10, "icon": "📚"},
            {"id": 2, "name": "完成作业", "points": 15, "icon": "✏️"},
            {"id": 3, "name": "整理房间", "points": 8, "icon": "🧹"},
            {"id": 4, "name": "运动30分钟", "points": 12, "icon": "🏃"},
            {"id": 5, "name": "练习钢琴", "points": 10, "icon": "🎹"},
            {"id": 6, "name": "帮助做家务", "points": 8, "icon": "🏠"},
            {"id": 7, "name": "早睡早起", "points": 5, "icon": "⏰"},
            {"id": 8, "name": "自己收拾书包", "points": 5, "icon": "🎒"}
        ],
        "records": [],
        "settings": {
            "targetPoints": 100,
            "rewardText": "神秘奖励"
        }
    }
}


def load_data():
    if not os.path.exists(DATA_FILE):
        return json.loads(json.dumps(DEFAULT_DATA))
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        for key in DEFAULT_DATA:
            if key not in data:
                data[key] = DEFAULT_DATA[key]
        return data
    except (json.JSONDecodeError, IOError):
        return json.loads(json.dumps(DEFAULT_DATA))


def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)


@app.route('/api/data', methods=['GET'])
def get_data():
    return jsonify(load_data())


@app.route('/api/data', methods=['POST'])
def set_data():
    try:
        data = request.get_json()
        if not isinstance(data, dict):
            return jsonify({"error": "Invalid data"}), 400
        save_data(data)
        return jsonify({"status": "ok", "savedAt": datetime.now().isoformat()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/backup/download')
def download_backup():
    data = load_data()
    data['exportTime'] = datetime.now().isoformat()
    data['version'] = '2.0'
    return jsonify(data)


@app.route('/api/health')
def health():
    return jsonify({"status": "ok", "serverTime": datetime.now().isoformat()})


if __name__ == '__main__':
    print("🚀 奥特曼盲盒服务器启动中...")
    print(f"📁 数据文件: {DATA_FILE}")
    print(f"🌐 访问地址: http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
