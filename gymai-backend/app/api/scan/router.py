import traceback
from fastapi import APIRouter, HTTPException
from app.models.scan import ScanRequest, ScanResponse
from app.services.llm_service import analyze_equipment_image

router = APIRouter(prefix="/scan", tags=["Scanning"])

@router.post("/equipment", response_model=ScanResponse)
async def scan_user_environment(request: ScanRequest):
    try:
        ai_data = await analyze_equipment_image(request.image_base64)
        return ScanResponse(**ai_data)
        
    except Exception as e:
        # Imprimimos el error real en tu terminal
        print("\n" + "="*50)
        print(f"ERROR VISIÓN COMPUTACIONAL:")
        traceback.print_exc()
        print("="*50 + "\n")
        
        raise HTTPException(
            status_code=500, 
            detail=f"Error interno: {str(e)}"
        )