import os
import logging
import pathlib
from fastapi import FastAPI, Form, HTTPException, Depends, UploadFile
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
from pydantic import BaseModel
from contextlib import asynccontextmanager
import json 
import hashlib
from datetime import datetime
import pytz  


# Define the path to the images & sqlite3 database
images = pathlib.Path(__file__).parent.resolve() / "images"
db = pathlib.Path(__file__).parent.resolve() / "db" / "mercari.sqlite3"
# items = pathlib.Path(__file__).parent.resolve() / "items.json" 

# def get_items():
#     if not items.exists():
#         with open(items, "w") as f:
#             items.parent.mkdir(parents=True, exist_ok=True)
#             json.dump({"items": []}, f)
#     return items
 
 
def get_db():

    conn = sqlite3.connect(db)
    conn.row_factory = sqlite3.Row  
    try:
        yield conn
    finally:
        conn.close()
        
        
    
# STEP 5-1: set up the database connection
# Define Japan Timezone
JST = pytz.timezone('Asia/Tokyo')

def setup_database():
    with sqlite3.connect(db) as conn:
        cursor = conn.execute("PRAGMA table_info(items);")
        columns = [row[1] for row in cursor.fetchall()]

        if "timestamp" not in columns:
            conn.execute("ALTER TABLE items ADD COLUMN timestamp TEXT;")

        conn.execute("""
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category_id INTEGER NOT NULL,
                image_name TEXT NOT NULL,
                timestamp TEXT NOT NULL,  -- Store time as text in JST
                FOREIGN KEY (category_id) REFERENCES categories(id)
            );
        """)
        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL 
            );
        """)
        conn.commit()


# Added new function
def upload_image(image: UploadFile):
    image_data = image.file.read()
    hashed_value = hashlib.sha256(image_data).hexdigest()
    image_name = f"{hashed_value}.jpg"
    with open(images/image_name, "wb") as image_file:
        image_file.write(image_data)
    return image_name


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_database()
    yield


app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost:3000",  
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, 
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

logger = logging.getLogger("uvicorn")
# optional
logger.setLevel(logging.DEBUG)
images = pathlib.Path(__file__).parent.resolve() / "images"
origins = [os.environ.get("FRONT_URL", "http://localhost:3000")]
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=origins,
#     allow_credentials=False,
#     allow_methods=["GET", "POST", "PUT", "DELETE"],
#     allow_headers=["*"],
# )


class HelloResponse(BaseModel):
    message: str


@app.get("/", response_model=HelloResponse)
def hello():
    return HelloResponse(**{"message": "Hello, world!"})


class AddItemResponse(BaseModel):
    message: str
    

class Item(BaseModel):
    name: str
    category: str
    image_name: str 



def insert_item(item: Item, conn: sqlite3.Connection):
    conn.row_factory = sqlite3.Row

    conn.execute("INSERT OR IGNORE INTO categories (name) VALUES (?)", (item.category,))
    conn.commit()

    cursor = conn.execute("SELECT id FROM categories WHERE name = ?", (item.category,))
    category_id = cursor.fetchone()["id"]

    jst = pytz.timezone('Asia/Tokyo')
    timestamp = datetime.now(jst).strftime('%Y-%m-%d %H:%M:%S') 

    conn.execute(
        "INSERT INTO items (name, category_id, image_name, timestamp) VALUES (?, ?, ?, ?)",
        (item.name, category_id, item.image_name, timestamp)
    )
    conn.commit()

   
        
def fetch_all_items(conn: sqlite3.Connection):
    conn.row_factory = sqlite3.Row
    rows = conn.execute("""
        SELECT items.id, items.name, categories.name AS category, items.image_name, items.timestamp 
        FROM items
        JOIN categories ON items.category_id = categories.id;
    """).fetchall()

    backend_url = os.environ.get("BACKEND_URL", "http://localhost:9000")
    items = []
    
    for row in rows:
        item = dict(row)
        item["image_url"] = f"{backend_url}/image/{item['image_name']}" if item["image_name"] else None
        items.append(item)

    return items
 


def fetch_item_by_id(conn: sqlite3.Connection, item_id: int):
    conn.row_factory = sqlite3.Row
    row = conn.execute("""
                           SELECT items.id, items.name, categories.name AS category, items.image_name, items.timestamp FROM items
                           JOIN categories ON items.category_id = categories.id WHERE items.id = ?;
        """, (item_id,)).fetchone()
    
    if row is None:
        raise HTTPException(status_code=404, detail="Item not found")

    backend_url = os.environ.get("BACKEND_URL", "http://localhost:9000")
    item = dict(row)
    item["image_url"] = f"{backend_url}/image/{item['image_name']}" if item["image_name"] else None
    return item



def search_items_in_db(conn: sqlite3.Connection, keyword: str):
    conn.row_factory = sqlite3.Row
    rows = conn.execute("""
                            SELECT items.id, items.name, categories.name AS category, items.image_name FROM items
                            JOIN categories ON items.category_id = categories.id WHERE items.name LIKE ?;
        """, (f"%{keyword}%",)).fetchall()
        
    return [dict(r) for r in rows]
        
# add_item is a handler to add a new item for POST /items .
@app.post("/items", response_model=AddItemResponse)
def add_item(
    name: str = Form(...),
    category: str = Form(...),
    image: UploadFile = Form(...),
    conn: sqlite3.Connection = Depends(get_db)
):
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    if not category:
        raise HTTPException(status_code=400, detail="category is required")
    if not image:
        raise HTTPException(status_code=400, detail="image is required")
    
    image_name = upload_image(image)
    item = Item(name=name, category=category, image_name=image_name)
    insert_item(item,conn)
    return {"message": f"item received: {name}"}

# MVC model
@app.get("/items")
def get_all_items(conn: sqlite3.Connection = Depends(get_db)):  
    items_data = fetch_all_items(conn)
    return {"items": items_data} 



@app.get("/items/{item_id}")
def get_item_info(item_id: int, conn: sqlite3.Connection = Depends(get_db)):
    item_data = fetch_item_by_id(conn, item_id)  
    return item_data


@app.get("/search")
def search_items(keyword: str):
    items_data = search_items_in_db(keyword) 
    return {"items": items_data}


# get_image is a handler to return an image for GET /images/{filename} .
@app.get("/image/{image_name}")
async def get_image(image_name):
    # Create image path
    image = images / image_name

    if not image_name.endswith(".jpg"):
        raise HTTPException(status_code=400, detail="Image path does not end with .jpg")

    if not image.exists():
        logger.debug(f"Image not found: {image}")
        image = images / "default.jpg"

    return FileResponse(image)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=9000, reload=True)