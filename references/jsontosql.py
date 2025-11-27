import json
import re

TYPE_MAP = {
    "string": "TEXT",
    "number": "REAL",
    "boolean": "BOOLEAN",
    "Date": "DATETIME",
    "any": "TEXT",
    "object": "JSON"
}

def ts_type_to_sql(ts_type: str):
    for k, v in TYPE_MAP.items():
        if k in ts_type:
            return v
    return "TEXT"

def normalize_name(name: str):
    return re.sub(r'[^a-zA-Z0-9_]', '_', name).lower()

def main():
    with open("srcuml.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    db_map = {}

    for node in data.get("nodes", []):
        if node.get("type") not in ["class", "interface"]:
            continue

        table_name = normalize_name(node["title"]["text"])
        table_fields = {}

        for attr in node.get("attributes", []):
            col_name = normalize_name(attr.get("name", ""))
            if not col_name:
                continue

            ts_text = attr.get("text", "")
            m = re.search(r":\s*([A-Za-z0-9_|'\[\]<>]+)", ts_text)
            ts_type = m.group(1) if m else "string"
            sql_type = ts_type_to_sql(ts_type)
            table_fields[col_name] = sql_type

        # Ensure ID exists
        if "id" not in table_fields:
            table_fields["id"] = "TEXT PRIMARY KEY"

        db_map[table_name] = table_fields

    with open("ARCHITECTURE_DB_MAP.json", "w", encoding="utf-8") as out:
        json.dump(db_map, out, indent=2)

    print("✅ Hash map schema saved to ARCHITECTURE_DB_MAP.json")

if __name__ == "__main__":
    main()
