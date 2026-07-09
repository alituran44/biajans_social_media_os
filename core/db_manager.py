import sqlite3
import os
import hashlib
import logging
import time

logger = logging.getLogger("DatabaseManager")

DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")
if "VERCEL" in os.environ or os.environ.get("VERCEL"):
    DB_PATH = "/tmp/database.db"
    if not os.path.exists(DB_PATH):
        try:
            original_db = os.path.join(os.path.dirname(__file__), "database.db")
            if os.path.exists(original_db):
                import shutil
                shutil.copy(original_db, DB_PATH)
        except Exception:
            pass

def get_connection():
    """Returns a connection to the SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password: str, salt: bytes = None) -> str:
    """Hashes a password using PBKDF2-SHA256."""
    if not salt:
        salt = os.urandom(16)
    pwdhash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return salt.hex() + ":" + pwdhash.hex()

def verify_password(stored_password: str, provided_password: str) -> bool:
    """Verifies a password against its hash."""
    try:
        salt_hex, hash_hex = stored_password.split(":")
        salt = bytes.fromhex(salt_hex)
        pwdhash = hashlib.pbkdf2_hmac('sha256', provided_password.encode('utf-8'), salt, 100000)
        return pwdhash.hex() == hash_hex
    except Exception:
        return False

def init_db():
    """Initializes the database schema and seeds the default admin user."""
    logger.info("Initializing SQLite database...")
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Create Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # 2. Create Tokens Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tokens (
        brand_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        encrypted_token_data TEXT NOT NULL,
        profile_json TEXT,
        connected_at INTEGER NOT NULL,
        PRIMARY KEY (brand_id, platform)
    )
    """)
    
    # 3. Create Tasks Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brand_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL, -- 'Pending', 'In Progress', 'Done'
        assigned_to TEXT,
        due_date TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # Create Sessions Table for persistence
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        role TEXT NOT NULL,
        email TEXT NOT NULL,
        expires REAL NOT NULL
    )
    """)

    # --- CRM Tables ---
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS crm_leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brand_id TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        stage TEXT NOT NULL DEFAULT 'new', -- 'new', 'contacted', 'proposal', 'won', 'lost'
        budget REAL DEFAULT 0.0,
        source TEXT DEFAULT 'Direct',      -- 'Instagram', 'WhatsApp', 'Web Form', etc.
        created_at INTEGER NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS crm_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lead_id INTEGER NOT NULL,
        sender TEXT NOT NULL,              -- 'lead', 'user', 'ai'
        message TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS crm_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lead_id INTEGER NOT NULL,
        note_text TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE
    )
    """)
    
    # 4. Seed Default Admin User
    cursor.execute("SELECT id FROM users WHERE username = 'admin'")
    if not cursor.fetchone():
        admin_pw_hash = hash_password("admin")
        cursor.execute("""
            INSERT INTO users (username, email, password_hash, role)
            VALUES (?, ?, ?, ?)
        """, ("admin", "admin@biajans.com", admin_pw_hash, "admin"))
        logger.info("Default admin user seeded successfully.")
        
    # 5. Seed Default Mock Tasks if empty
    cursor.execute("SELECT count(*) FROM tasks")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT INTO tasks (brand_id, title, description, status, assigned_to, due_date)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ("global", "Instagram Görselini Paylaş", "Fıstık ezmesi kampanyasının ilk görselini Instagram'da paylaş.", "Pending", "admin", "2026-06-20"))
        cursor.execute("""
            INSERT INTO tasks (brand_id, title, description, status, assigned_to, due_date)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ("global", "Google Ads Kampanyası Oluştur", "Arama ağı kampanyasını başlat ve günlük bütçeyi 150 TL yap.", "In Progress", "admin", "2026-06-22"))
        logger.info("Mock tasks seeded successfully.")

    # 6. Seed Default CRM Leads if empty
    cursor.execute("SELECT count(*) FROM crm_leads")
    if cursor.fetchone()[0] == 0:
        now = int(time.time())
        # Leads
        cursor.execute("""
            INSERT INTO crm_leads (brand_id, name, email, phone, stage, budget, source, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, ("global", "Ahmet Yılmaz", "ahmet.yilmaz@gmail.com", "0555 111 22 33", "new", 2500.0, "Instagram", now - 86400 * 2))
        ahmet_id = cursor.lastrowid

        cursor.execute("""
            INSERT INTO crm_leads (brand_id, name, email, phone, stage, budget, source, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, ("global", "Ayşe Demir", "ayse.demir@outlook.com", "0555 222 33 44", "contacted", 4200.0, "WhatsApp", now - 86400 * 5))
        ayse_id = cursor.lastrowid

        cursor.execute("""
            INSERT INTO crm_leads (brand_id, name, email, phone, stage, budget, source, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, ("global", "Mehmet Kaya", "mehmet.kaya@gmail.com", "0555 333 44 55", "proposal", 7500.0, "Web Form", now - 86400 * 10))
        mehmet_id = cursor.lastrowid

        cursor.execute("""
            INSERT INTO crm_leads (brand_id, name, email, phone, stage, budget, source, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, ("global", "Canan Şahin", "canan.sahin@sahin.com", "0555 444 55 66", "won", 12000.0, "Google Ads", now - 86400 * 15))
        canan_id = cursor.lastrowid

        # Messages for Ahmet Yılmaz
        cursor.execute("""
            INSERT INTO crm_messages (lead_id, sender, message, created_at)
            VALUES (?, ?, ?, ?)
        """, (ahmet_id, "lead", "Merhaba, yer fıstığı ezmesi lansman ürünleriniz stokta var mı?", now - 86400 * 2))

        # Messages for Ayşe Demir
        cursor.execute("""
            INSERT INTO crm_messages (lead_id, sender, message, created_at)
            VALUES (?, ?, ?, ?)
        """, (ayse_id, "lead", "Merhaba, fıstık ezmesi fiyatlarınız hakkında bilgi alabilir miyim?", now - 86400 * 5))
        cursor.execute("""
            INSERT INTO crm_messages (lead_id, sender, message, created_at)
            VALUES (?, ?, ?, ?)
        """, (ayse_id, "user", "Merhaba Ayşe Hanım! Organik fıstık ezmemiz 250gr kavanozlarda 120 TL'dir. Toplu alımlarda indirim yapıyoruz.", now - 86400 * 4))
        cursor.execute("""
            INSERT INTO crm_messages (lead_id, sender, message, created_at)
            VALUES (?, ?, ?, ?)
        """, (ayse_id, "lead", "Harika, 10 adet almak istesem ne kadar indirim olur?", now - 86400 * 4))

        # Messages for Mehmet Kaya
        cursor.execute("""
            INSERT INTO crm_messages (lead_id, sender, message, created_at)
            VALUES (?, ?, ?, ?)
        """, (mehmet_id, "lead", "Yeni kahve çekirdekleri lansmanınız için kurumsal teklif almak istiyoruz.", now - 86400 * 10))
        cursor.execute("""
            INSERT INTO crm_messages (lead_id, sender, message, created_at)
            VALUES (?, ?, ?, ?)
        """, (mehmet_id, "user", "Mehmet Bey merhaba, kurumsal lansman paketlerimizi hazırlayıp teklif PDF'ini iletiyorum.", now - 86400 * 9))
        cursor.execute("""
            INSERT INTO crm_messages (lead_id, sender, message, created_at)
            VALUES (?, ?, ?, ?)
        """, (mehmet_id, "lead", "Teşekkürler, teklifi inceleyip geri döneceğim.", now - 86400 * 9))

        # Notes for Mehmet Kaya
        cursor.execute("""
            INSERT INTO crm_notes (lead_id, note_text, created_at)
            VALUES (?, ?, ?)
        """, (mehmet_id, "Müşteri kahve lansmanı için 50 paket kurumsal hediye seti teklifi istedi.", now - 86400 * 10))
        cursor.execute("""
            INSERT INTO crm_notes (lead_id, note_text, created_at)
            VALUES (?, ?, ?)
        """, (mehmet_id, "Teklif PDF formatında gönderildi. Pazartesi günü takip araması yapılacak.", now - 86400 * 9))

        logger.info("Mock CRM data seeded successfully.")
        
    conn.commit()
    conn.close()
    logger.info("SQLite database initialization complete.")

# Initialize the database when the module is imported
init_db()

def create_session(session_id: str, username: str, role: str, email: str, expires: float):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT OR REPLACE INTO sessions (session_id, username, role, email, expires)
            VALUES (?, ?, ?, ?, ?)
        """, (session_id, username, role, email, expires))
        conn.commit()
    except Exception as e:
        logger.error(f"Error creating session: {e}")
    finally:
        conn.close()

def get_session(session_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT session_id, username, role, email, expires FROM sessions WHERE session_id = ?", (session_id,))
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None
    except Exception as e:
        logger.error(f"Error getting session: {e}")
        return None
    finally:
        conn.close()

def delete_session(session_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
        conn.commit()
    except Exception as e:
        logger.error(f"Error deleting session: {e}")
    finally:
        conn.close()

def clean_expired_sessions():
    import time
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM sessions WHERE expires < ?", (time.time(),))
        conn.commit()
    except Exception as e:
        logger.error(f"Error cleaning expired sessions: {e}")
    finally:
        conn.close()

def get_user_by_username(username: str):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, username, email, password_hash, role, created_at FROM users WHERE username = ?", (username,))
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None
    except Exception as e:
        logger.error(f"Error getting user by username: {e}")
        return None
    finally:
        conn.close()

def list_users():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, username, email, role, created_at FROM users")
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"Error listing users: {e}")
        return []
    finally:
        conn.close()

def add_user(username: str, email: str, password_raw: str, role: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    try:
        password_hash_str = hash_password(password_raw)
        cursor.execute("""
            INSERT INTO users (username, email, password_hash, role)
            VALUES (?, ?, ?, ?)
        """, (username, email, password_hash_str, role))
        conn.commit()
        return True
    except Exception as e:
        logger.error(f"Error adding user: {e}")
        return False
    finally:
        conn.close()

def delete_user(user_id: int) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        return True
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        return False
    finally:
        conn.close()

def list_tasks(brand_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Allow brand specific tasks plus global tasks
        cursor.execute("""
            SELECT id, brand_id, title, description, status, assigned_to, due_date, created_at 
            FROM tasks 
            WHERE brand_id = ? OR brand_id = 'global'
        """, (brand_id,))
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"Error listing tasks: {e}")
        return []
    finally:
        conn.close()

def add_task(brand_id: str, title: str, description: str, assigned_to: str, due_date: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO tasks (brand_id, title, description, status, assigned_to, due_date)
            VALUES (?, ?, ?, 'Pending', ?, ?)
        """, (brand_id, title, description, assigned_to, due_date))
        conn.commit()
        return True
    except Exception as e:
        logger.error(f"Error adding task: {e}")
        return False
    finally:
        conn.close()

def update_task_status(task_id: int, status: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE tasks SET status = ? WHERE id = ?", (status, task_id))
        conn.commit()
        return True
    except Exception as e:
        logger.error(f"Error updating task status: {e}")
        return False
    finally:
        conn.close()

def delete_task(task_id: int) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        conn.commit()
        return True
    except Exception as e:
        logger.error(f"Error deleting task: {e}")
        return False
    finally:
        conn.close()

