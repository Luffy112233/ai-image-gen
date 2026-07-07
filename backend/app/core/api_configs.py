"""API 配置管理模块 — 存储和管理多个 API 提供商配置。"""

import sqlite3
import os
import json
from typing import Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "api_configs.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)


def get_db():
    """获取数据库连接。"""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """初始化 API 配置表。"""
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS api_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            api_url TEXT NOT NULL,
            api_key TEXT NOT NULL,
            is_active BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


def list_configs() -> list[dict]:
    """列出所有 API 配置。"""
    conn = get_db()
    rows = conn.execute("SELECT * FROM api_configs ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_config(config_id: int) -> Optional[dict]:
    """获取单个 API 配置。"""
    conn = get_db()
    row = conn.execute("SELECT * FROM api_configs WHERE id = ?", (config_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def create_config(name: str, api_url: str, api_key: str) -> dict:
    """创建新的 API 配置。"""
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO api_configs (name, api_url, api_key) VALUES (?, ?, ?)",
        (name, api_url, api_key),
    )
    conn.commit()
    config_id = cur.lastrowid
    config = get_config(config_id)
    conn.close()
    return config


def update_config(config_id: int, name: str, api_url: str, api_key: str) -> Optional[dict]:
    """更新 API 配置。"""
    conn = get_db()
    conn.execute(
        "UPDATE api_configs SET name = ?, api_url = ?, api_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (name, api_url, api_key, config_id),
    )
    conn.commit()
    config = get_config(config_id)
    conn.close()
    return config


def delete_config(config_id: int) -> bool:
    """删除 API 配置。"""
    conn = get_db()
    cur = conn.execute("DELETE FROM api_configs WHERE id = ?", (config_id,))
    conn.commit()
    deleted = cur.rowcount > 0
    conn.close()
    return deleted


def set_active_config(config_id: int) -> bool:
    """设置当前活跃的 API 配置。"""
    conn = get_db()
    # 先取消所有活跃配置
    conn.execute("UPDATE api_configs SET is_active = 0")
    # 设置新的活跃配置
    cur = conn.execute("UPDATE api_configs SET is_active = 1 WHERE id = ?", (config_id,))
    conn.commit()
    success = cur.rowcount > 0
    conn.close()
    return success


def get_active_config() -> Optional[dict]:
    """获取当前活跃的 API 配置。"""
    conn = get_db()
    row = conn.execute("SELECT * FROM api_configs WHERE is_active = 1 LIMIT 1").fetchone()
    conn.close()
    return dict(row) if row else None
