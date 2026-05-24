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
        "dailyReward": 1,
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
    """加载数据，文件不存在时自动创建并写入默认值"""
    if not os.path.exists(DATA_FILE):
        data = json.loads(json.dumps(DEFAULT_DATA))
        data['_createdAt'] = datetime.now().isoformat()
        data['_initialized'] = True
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✅ 数据文件已初始化: {DATA_FILE}")
        print(f"   sharedPoints = {data['sharedPoints']}")
        return data

    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # 补全缺失的顶层 key
        updated = False
        for key in DEFAULT_DATA:
            if key not in data:
                data[key] = json.loads(json.dumps(DEFAULT_DATA[key]))
                updated = True
                print(f"⚠️  检测到缺失字段 '{key}'，已用默认值补全")

        if updated:
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

        return data
    except (json.JSONDecodeError, IOError) as e:
        print(f"❌ 数据文件损坏: {e}，使用默认值重建")
        data = json.loads(json.dumps(DEFAULT_DATA))
        data['_recoveredAt'] = datetime.now().isoformat()
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return data


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
    data = load_data()
    # 清理内部字段，不暴露给前端
    data.pop('_createdAt', None)
    data.pop('_initialized', None)
    data.pop('_recoveredAt', None)
    return jsonify(data)


@app.route('/api/data', methods=['POST'])
def set_data():
    try:
        data = request.get_json()
        if not isinstance(data, dict):
            return jsonify({"error": "Invalid data"}), 400
        # 保留内部字段
        old = load_data()
        for key in ['_createdAt', '_initialized', '_recoveredAt']:
            if key in old:
                data[key] = old[key]
        save_data(data)
        return jsonify({"status": "ok", "savedAt": datetime.now().isoformat()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/init', methods=['POST'])
def init_data():
    """手动初始化/重置数据"""
    data = json.loads(json.dumps(DEFAULT_DATA))
    data['_createdAt'] = datetime.now().isoformat()
    data['_initialized'] = True
    save_data(data)
    print(f"🔄 数据已通过 /api/init 重置")
    data.pop('_createdAt', None)
    data.pop('_initialized', None)
    return jsonify({"status": "ok", "message": "数据已初始化", "data": data})


@app.route('/api/backup/download')
def download_backup():
    data = load_data()
    data['exportTime'] = datetime.now().isoformat()
    data['version'] = '2.0'
    return jsonify(data)


@app.route('/api/health')
def health():
    data = load_data()
    return jsonify({
        "status": "ok",
        "serverTime": datetime.now().isoformat(),
        "dataFile": os.path.exists(DATA_FILE),
        "sharedPoints": data.get('sharedPoints', 0),
    })


if __name__ == '__main__':
    print("🚀 奥特曼盲盒服务器启动中...")
    print(f"📁 数据文件: {DATA_FILE}")

    # 启动时确保数据文件存在
    data = load_data()
    sp = data.get('sharedPoints', 0)
    created = data.get('_createdAt', '')
    init = data.get('_initialized', False)
    if created:
        print(f"📊 当前积分: {sp} | 创建于: {created}")
    else:
        print(f"📊 当前积分: {sp}")

    print(f"🌐 访问地址: http://localhost:5000")
    print(f"🔄 如需重置数据: POST http://localhost:5000/api/init")
    app.run(host='0.0.0.0', port=5000, debug=True)
