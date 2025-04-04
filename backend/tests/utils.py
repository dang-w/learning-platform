from bson import ObjectId

def serialize_object_id(obj):
    """Recursively convert ObjectId instances to strings in nested dicts/lists."""
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, dict):
        return {k: serialize_object_id(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [serialize_object_id(item) for item in obj]
    return obj