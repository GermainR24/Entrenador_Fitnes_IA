from sqlmodel import SQLModel, Field
from typing import List

class EquipmentItem(SQLModel):
    name: str = Field(description="Nombre del equipamiento (ej. Mancuernas, Banco, Esterilla)")
    is_usable: bool = Field(description="Indica si es un elemento útil para el entrenamiento")

class ScanRequest(SQLModel):
    image_base64: str = Field(description="Imagen capturada desde el canvas en formato base64")

class ScanResponse(SQLModel):
    detected_items: List[EquipmentItem]
    scan_message: str = Field(description="Mensaje de retroalimentación para la UI")