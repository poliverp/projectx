import fitz  # PyMuPDF
from docx import Document as DocxDocument # Rename to avoid clash with our DB model
import os

def extract_text_from_pdf(pdf_path):
    """
    Extracts text content from a PDF file.

    Args:
        pdf_path (str): The full path to the PDF file on the server.

    Returns:
        str: The extracted text, or None if an error occurs.
    """
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found at {pdf_path}")
        return None
    try:
        text = ""
        # Use fitz.open() to handle the PDF file
        with fitz.open(pdf_path) as doc:
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text += page.get_text("text") # Extract plain text from the page
                text += "\n" # Add a newline between pages for readability
        return text
    except Exception as e:
        # Log the error for debugging
        print(f"Error extracting text from PDF '{pdf_path}': {e}")
        return None # Return None to indicate failure

def extract_text_from_docx(docx_path):
    """
    Extracts text content from a DOCX file.

    Args:
        docx_path (str): The full path to the DOCX file on the server.

    Returns:
        str: The extracted text, or None if an error occurs.
    """
    if not os.path.exists(docx_path):
        print(f"Error: DOCX file not found at {docx_path}")
        return None
    try:
        # Use python-docx to open the document
        document = DocxDocument(docx_path)
        full_text = []
        # Iterate through each paragraph in the document
        for para in document.paragraphs:
            full_text.append(para.text)
        # Join all paragraphs with newline characters
        return '\n'.join(full_text)
    except Exception as e:
        # Log the error
        print(f"Error extracting text from DOCX '{docx_path}': {e}")
        return None # Return None on failure

# You could add functions for other file types here if needed (.txt, .rtf, etc.)