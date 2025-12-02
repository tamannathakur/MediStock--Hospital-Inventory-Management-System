import sys
import json
from paddleocr import PaddleOCR

# Initialize OCR
ocr = PaddleOCR(
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False
)

if __name__ == "__main__":
    image_path = sys.argv[1]
    result = ocr.predict(input=image_path)
    
    try:
        rec_texts = []
        for res in result:
            if isinstance(res, dict) and 'rec_texts' in res:
                rec_texts.extend(res['rec_texts'])
        print(json.dumps({"success": True, "texts": rec_texts}))
        
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
    
    sys.stdout.flush()