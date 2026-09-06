import re

RULES = {
    'EMERGENCY': {
        'keywords': ['chest pain', 'breathing', 'unconscious', 'bleeding', 'heart attack', 'stroke', 'seizure', 'choking'],
        'category': 'EMERGENCY_CARE',
        'bypass_queue': True,
    },
    'URGENT': {
        'keywords': ['fever', 'fracture', 'severe pain', 'vomiting', 'burn', 'dizziness', 'infection', 'headache'],
        'category': 'PRIORITY_APPOINTMENT',
        'bypass_queue': False,
    }
}

def evaluate_triage(chief_complaint: str) -> dict:
    """
    Evaluates a chief complaint string against triage rules.
    Returns a dictionary with:
      - priority: str
      - category: str
      - bypass_queue: bool
      - notes: str
    """
    if not chief_complaint:
        return {
            'priority': 'NORMAL',
            'category': 'ROUTINE_OUTPATIENT',
            'bypass_queue': False,
            'notes': 'No complaint provided. Defaulting to NORMAL.'
        }
        
    normalized = chief_complaint.lower()
    
    # Check EMERGENCY rules
    for kw in RULES['EMERGENCY']['keywords']:
        if re.search(r'\b' + re.escape(kw) + r'\b', normalized):
            return {
                'priority': 'EMERGENCY',
                'category': RULES['EMERGENCY']['category'],
                'bypass_queue': RULES['EMERGENCY']['bypass_queue'],
                'notes': f"Triggered by emergency keyword: '{kw}'."
            }
            
    # Check URGENT rules
    for kw in RULES['URGENT']['keywords']:
        if re.search(r'\b' + re.escape(kw) + r'\b', normalized):
            return {
                'priority': 'URGENT',
                'category': RULES['URGENT']['category'],
                'bypass_queue': RULES['URGENT']['bypass_queue'],
                'notes': f"Triggered by urgent keyword: '{kw}'."
            }

    # Default to NORMAL
    return {
        'priority': 'NORMAL',
        'category': 'ROUTINE_OUTPATIENT',
        'bypass_queue': False,
        'notes': 'No concerning keywords found. Defaulting to NORMAL.'
    }
