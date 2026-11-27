import os
import sys
import shutil
import time
import subprocess
import json
from datetime import datetime
import cv2
import pandas as pd
import numpy as np
from pathlib import Path
from flask import Flask, render_template_string, jsonify, request, send_file

app = Flask(__name__)

DOC_DIR = Path("data/raw/supporting document/supporting_docu")
DEFAULT_CSV = Path("data/interim/document_processing/ground_truth_annotations/text_detection_annotations.csv")
DEFAULT_OCR_CSV = Path("data/interim/document_processing/ground_truth_annotations/ocr_transcription_annotations.csv")
DEFAULT_VIS_DIR = Path("data/interim/document_processing/bounding_box_visualizations")
LABELS_CONFIG = Path("data/interim/document_processing/annotation_label_classes.json")
BOX_TYPES_CONFIG = Path("data/interim/document_processing/annotation_box_types.json")
DEFAULT_VIS_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_BOX_TYPES = [
    {"id": "CHECKMARK_OR_CHECKBOX", "label": "☑️ Checkmark / Checkbox"},
    {"id": "HANDWRITTEN_ENTRY", "label": "✍️ Handwritten Entry"},
    {"id": "FORM_SECTION", "label": "📋 Printed Form Section"},
    {"id": "SIGNATURE", "label": "✒️ Signature"},
    {"id": "STAMP_OR_SEAL", "label": "🔘 Official Stamp / Seal"},
    {"id": "TABLE_CELL", "label": "📊 Table Cell"}
]

def load_box_types():
    if BOX_TYPES_CONFIG.exists():
        try:
            with open(BOX_TYPES_CONFIG, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    return data
        except Exception:
            pass
    return DEFAULT_BOX_TYPES

def save_box_types_to_disk(types_list):
    BOX_TYPES_CONFIG.parent.mkdir(parents=True, exist_ok=True)
    with open(BOX_TYPES_CONFIG, 'w', encoding='utf-8') as f:
        json.dump(types_list, f, indent=2)

DEFAULT_LABELS = [
    "msws_no", "clinic_no", "referred_by", "surname", "first_name", "middle_name",
    "sex", "marital_status", "address", "place_of_birth", "religion", "educational_attainment",
    "source_of_income", "occupation", "philhealth_membership",
    "family_member_1_name", "family_member_1_rel", "family_member_1_age", "family_member_1_marital", "family_member_1_education", "family_member_1_occupation", "family_member_1_income",
    "family_member_2_name", "family_member_2_rel", "family_member_2_age", "family_member_2_marital", "family_member_2_education", "family_member_2_occupation", "family_member_2_income",
    "family_member_3_name", "family_member_3_rel", "family_member_3_age", "family_member_3_marital", "family_member_3_education", "family_member_3_occupation", "family_member_3_income",
    "family_member_4_name", "family_member_4_rel", "family_member_4_age", "family_member_4_marital", "family_member_4_education", "family_member_4_occupation", "family_member_4_remarks", "family_member_4_income",
    "family_member_5_name", "family_member_5_rel", "family_member_5_age", "family_member_5_marital", "family_member_5_education", "family_member_5_occupation", "family_member_5_remarks", "family_member_5_income",
    "housing_condition", "water_source", "total_family_income", "per_capita_income",
    "total_amount_billed", "diagnosis", "doctor_signature", "barangay_seal", "hospital_stamp",
    "prescription_date", "patient_name", "medication_name", "dosage_instructions", "doctor_name", "license_no", "ptr_no"
]

def load_labels():
    if LABELS_CONFIG.exists():
        try:
            with open(LABELS_CONFIG, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    return data
        except Exception:
            pass
    return DEFAULT_LABELS

def save_labels_to_disk(labels_list):
    LABELS_CONFIG.parent.mkdir(parents=True, exist_ok=True)
    with open(LABELS_CONFIG, 'w', encoding='utf-8') as f:
        json.dump(labels_list, f, indent=2)

def get_annotated_file_stats(target_csv=None):
    csv_to_check = Path(target_csv) if target_csv else DEFAULT_CSV
    stats = {}
    if csv_to_check.exists():
        try:
            df = pd.read_csv(csv_to_check)
            col = 'file_name' if 'file_name' in df.columns else ('image_name' if 'image_name' in df.columns else None)
            if col:
                counts = df[col].value_counts().to_dict()
                for fname, count in counts.items():
                    stats[str(fname)] = int(count)
        except Exception:
            pass
    return stats

def get_all_images(target_csv=None):
    extensions = {'.jpg', '.jpeg', '.png'}
    images = []
    stats = get_annotated_file_stats(target_csv)
    for p in sorted(DOC_DIR.rglob('*')):
        if p.is_file() and p.suffix.lower() in extensions:
            rel = p.relative_to(DOC_DIR)
            fname = p.name
            box_count = stats.get(fname, 0)
            images.append({
                'file_name': fname,
                'relative_path': str(p).replace('\\', '/'),
                'category': rel.parts[1] if len(rel.parts) > 2 else 'general',
                'mode': rel.parts[0] if len(rel.parts) > 1 else 'unknown',
                'is_annotated': box_count > 0,
                'box_count': box_count
            })
    return images


HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>OFPHIL Document Bounding Box Annotator Ultimate Pro</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { display: flex; height: 100vh; background: #0b1120; color: #f8fafc; overflow: hidden; }
        
        #sidebar { width: 380px; background: #1e293b; border-right: 1px solid #334155; display: flex; flex-direction: column; padding: 10px; gap: 6px; z-index: 10; }
        h1 { font-size: 1rem; color: #38bdf8; font-weight: 700; display: flex; align-items: center; justify-content: space-between; }
        .badge { background: #0284c7; color: white; font-size: 0.68rem; padding: 2px 6px; border-radius: 4px; }
        
        button { cursor: pointer; padding: 5px 10px; border: none; border-radius: 6px; font-weight: 600; font-size: 0.78rem; transition: all 0.15s; }
        .btn-primary { background: #0284c7; color: white; }
        .btn-primary:hover { background: #0369a1; }
        .btn-ai { background: linear-gradient(135deg, #a855f7, #6366f1); color: white; }
        .btn-ai:hover { background: linear-gradient(135deg, #9333ea, #4f46e5); box-shadow: 0 0 10px rgba(168, 85, 247, 0.5); }
        .btn-success { background: #10b981; color: white; }
        .btn-success:hover { background: #059669; }
        .btn-danger { background: #ef4444; color: white; }
        .btn-danger:hover { background: #dc2626; }
        .btn-secondary { background: #334155; color: #cbd5e1; }
        .btn-secondary:hover { background: #475569; }
        
        label { font-size: 0.72rem; color: #94a3b8; font-weight: 600; }
        input[type="text"], select { width: 100%; padding: 4px 8px; background: #0f172a; border: 1px solid #475569; border-radius: 6px; color: white; font-size: 0.78rem; }
        input[type="text"]:focus, select:focus { outline: none; border-color: #38bdf8; }

        .filter-panel { background: #0f172a; padding: 6px; border-radius: 6px; border: 1px solid #334155; display: flex; flex-direction: column; gap: 4px; }
        .nav-controls { display: flex; gap: 6px; align-items: center; }

        .status-filter-group { display: flex; gap: 3px; background: #1e293b; padding: 2px; border-radius: 5px; border: 1px solid #334155; }
        .status-filter-btn { flex: 1; padding: 3px 4px; font-size: 0.68rem; font-weight: 600; background: transparent; color: #94a3b8; border-radius: 4px; border: none; cursor: pointer; text-align: center; }
        .status-filter-btn:hover { background: #334155; color: white; }
        .status-filter-btn.active { background: #0284c7; color: white; box-shadow: 0 0 4px rgba(2, 132, 199, 0.4); }

        .class-mgr { display: flex; gap: 4px; margin-top: 2px; }
        .preset-grid { overflow-y: auto; max-height: 90px; display: flex; flex-wrap: wrap; gap: 3px; padding: 4px; background: #0f172a; border-radius: 6px; border: 1px solid #334155; }
        .preset-chip { font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 5px; user-select: none; }
        .del-chip-btn { color: #f87171; font-weight: bold; padding: 0 3px; border-radius: 3px; cursor: pointer; }
        .del-chip-btn:hover { background: #ef4444; color: white; }

        .boxes-list-container { flex: 1; display: flex; flex-direction: column; min-height: 0; }
        .boxes-list { overflow-y: auto; background: #0f172a; border-radius: 6px; border: 1px solid #334155; padding: 4px; display: flex; flex-direction: column; gap: 3px; flex: 1; }
        .box-item { display: flex; justify-content: space-between; align-items: center; padding: 3px 6px; background: #1e293b; border-radius: 4px; font-size: 0.72rem; cursor: pointer; border-left: 3px solid #00e5ff; }
        .box-item.selected { background: #334155; border-color: #ffffff !important; box-shadow: 0 0 5px rgba(0, 229, 255, 0.4); }
        .box-item select { width: 130px; padding: 1px 3px; font-size: 0.7rem; }
        .box-item .del-btn { color: #f87171; cursor: pointer; font-weight: bold; margin-left: 6px; }

        .export-panel { background: #0f172a; padding: 6px; border-radius: 6px; border: 1px solid #334155; display: flex; flex-direction: column; gap: 4px; }
        .checkbox-group { display: flex; gap: 12px; font-size: 0.72rem; color: #cbd5e1; }
        .checkbox-group label { display: flex; align-items: center; gap: 4px; cursor: pointer; color: #cbd5e1; }

        .path-row { display: flex; gap: 4px; align-items: center; }

        #workspace { flex: 1; display: flex; flex-direction: column; background: #090d16; position: relative; overflow: hidden; }
        
        /* Floating Canvas Zoom & Controls Toolbar */
        .zoom-toolbar { position: absolute; top: 15px; right: 20px; z-index: 20; background: rgba(15, 23, 42, 0.94); backdrop-filter: blur(8px); padding: 4px 8px; border-radius: 8px; border: 1px solid #334155; display: flex; gap: 6px; align-items: center; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
        .zoom-toolbar.collapsed { padding: 4px; background: rgba(15, 23, 42, 0.8); border-color: #38bdf8; }
        .zoom-toolbar.collapsed .toolbar-content { display: none !important; }
        .zoom-toolbar button { padding: 4px 8px; font-size: 0.75rem; border: 1px solid #475569; }
        .zoom-toolbar button.active { background: #0284c7; color: white; border-color: #38bdf8; box-shadow: 0 0 6px rgba(56, 189, 248, 0.4); }
        .zoom-toolbar button:disabled { opacity: 0.35; cursor: not-allowed; }
        .zoom-toolbar .divider { border-left: 1px solid #475569; height: 18px; margin: 0 2px; }
        .zoom-toolbar span { font-size: 0.75rem; color: #38bdf8; font-weight: bold; min-width: 40px; text-align: center; }
        .collapse-btn { background: transparent; border: 1px solid transparent; color: #94a3b8; cursor: pointer; border-radius: 4px; font-size: 0.85rem; padding: 2px 6px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .collapse-btn:hover { background: #334155; color: #38bdf8; border-color: #475569; }

        #canvas-wrapper { flex: 1; position: relative; overflow: auto; display: flex; justify-content: center; align-items: flex-start; padding: 20px; user-select: none; }
        canvas { box-shadow: 0 10px 30px rgba(0,0,0,0.8); cursor: crosshair; }
        .status-bar { padding: 4px 14px; background: #1e293b; border-top: 1px solid #334155; display: flex; justify-content: space-between; font-size: 0.75rem; color: #94a3b8; }
        
        #toast {
            position: fixed; bottom: 35px; right: 25px; background: #10b981; color: white;
            padding: 10px 18px; border-radius: 8px; font-size: 0.85rem; font-weight: 600;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5); opacity: 0; pointer-events: none;
            transform: translateY(15px); transition: all 0.2s ease-out; z-index: 1000;
            display: flex; align-items: center; gap: 8px;
        }
        #toast.show { opacity: 1; transform: translateY(0); }
        #toast.toast-error { background: #ef4444; }

        /* Modal Styles */
        .modal-overlay {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(11, 17, 32, 0.85); backdrop-filter: blur(8px);
            display: flex; justify-content: center; align-items: center;
            z-index: 1000; opacity: 0; pointer-events: none;
            transition: opacity 0.2s ease-in-out;
        }
        .modal-overlay.active { opacity: 1; pointer-events: auto; display: flex !important; }
        .modal-card {
            background: #1e293b; border: 1px solid #38bdf8; border-radius: 12px;
            width: 580px; max-width: 95vw; max-height: 90vh; overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(56, 189, 248, 0.2);
            padding: 20px; display: flex; flex-direction: column; gap: 14px;
        }
        .modal-content {
            background: #1e293b; border: 1px solid #38bdf8; border-radius: 10px;
            width: 480px; max-width: 92vw; padding: 18px; box-shadow: 0 15px 40px rgba(0,0,0,0.8);
            display: flex; flex-direction: column; gap: 12px;
        }
        .modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 8px; }
        .modal-header h2, .modal-header h3 { font-size: 1.05rem; color: #38bdf8; display: flex; align-items: center; gap: 8px; font-weight: 700; }
        .modal-close { background: transparent; color: #94a3b8; font-size: 1.2rem; padding: 2px 8px; border: none; cursor: pointer; border-radius: 4px; }
        .modal-close:hover { color: #f87171; background: rgba(239, 68, 68, 0.1); }
        .direction-toggle-group { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .direction-card {
            border: 2px solid #334155; background: #0f172a; border-radius: 8px;
            padding: 10px; cursor: pointer; transition: all 0.15s; display: flex; flex-direction: column; gap: 4px;
        }
        .direction-card:hover { border-color: #64748b; background: #1e293b; }
        .direction-card.active { border-color: #38bdf8; background: rgba(2, 132, 199, 0.18); box-shadow: 0 0 10px rgba(56, 189, 248, 0.25); }
        .direction-card .dir-title { font-size: 0.85rem; font-weight: bold; color: #f8fafc; display: flex; align-items: center; gap: 6px; }
        .direction-card .dir-desc { font-size: 0.72rem; color: #94a3b8; line-height: 1.3; }
        .counterpart-summary-box { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px; font-size: 0.78rem; display: flex; flex-direction: column; gap: 6px; }
        .summary-metric { display: flex; justify-content: space-between; align-items: center; }
        .summary-metric .val { font-weight: bold; color: #38bdf8; }
        @keyframes pulse-bar { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
    </style>
</head>
<body>

    <div id="toast"><span id="toast-icon">✅</span> <span id="toast-msg">Saved!</span></div>

    <!-- SIDEBAR -->
    <div id="sidebar">
        <div>
            <h1>OFPHIL Annotator <span class="badge">Master AI</span></h1>
        </div>

        <!-- 1. FOLDER & IMAGE SELECTOR -->
        <div class="filter-panel">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <label>Folder Category:</label>
                <!-- AI Smart Pre-Annotate Button -->
                <button class="btn-ai" onclick="triggerAiSmartDetect()">⚡ AI Detect (Printed+HW)</button>
            </div>
            <select id="folder-select" onchange="onFolderChange()"></select>
            <!-- Batch Physical <-> Scan Counterpart Transfer -->
            <button id="btn-sidebar-batch-counterpart" class="btn-ai" style="padding:4px 8px; font-size:0.72rem; font-weight:600; margin-top:2px;" onclick="openBatchCounterpartModal()" title="Batch copy all files in folder between Physical and Scan">
                🔄 Batch Copy Folder: Physical ⇄ Scan
            </button>

            <!-- Status Filter Toggle -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
                <label>Filter By Status:</label>
                <span id="status-counts-badge" style="font-size:0.68rem; color:#38bdf8; font-weight:bold;"></span>
            </div>
            <div class="status-filter-group">
                <button type="button" class="status-filter-btn active" id="filter-btn-all" onclick="setStatusFilter('ALL')">All (<span id="count-all">0</span>)</button>
                <button type="button" class="status-filter-btn" id="filter-btn-annotated" onclick="setStatusFilter('ANNOTATED')">✅ Saved (<span id="count-annotated">0</span>)</button>
                <button type="button" class="status-filter-btn" id="filter-btn-pending" onclick="setStatusFilter('PENDING')">⏳ Pending (<span id="count-pending">0</span>)</button>
            </div>

            <div style="margin-top:2px;">
                <label>Select Document File:</label>
                <select id="file-select" onchange="onFileDropdownSelect()"></select>
            </div>
            <div class="nav-controls" style="margin-top:2px;">
                <button class="btn-secondary" onclick="confirmNavigate(-1)">❮ Prev</button>
                <span id="page-num" style="font-size:0.75rem; font-weight:bold; flex:1; text-align:center;">0 / 0</span>
                <button class="btn-secondary" onclick="confirmNavigate(1)">Next ❯</button>
            </div>
        </div>


        <!-- 2. LABELS & CLASS MANAGER -->
        <div style="display:flex; flex-direction:column; gap:3px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <label>Active Label Name:</label>
                <span id="active-label-badge" style="color:#00e5ff; font-size:0.75rem; font-weight:bold;">msws_no</span>
            </div>
            <input type="text" id="active-label" value="msws_no" oninput="document.getElementById('active-label-badge').innerText=this.value;">
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
                <label>Classes Palette:</label>
            </div>
            
            <input type="text" id="search-class" placeholder="🔍 Search class..." oninput="filterPresets()">
            
            <div class="class-mgr">
                <input type="text" id="new-class-input" placeholder="New class..." style="flex:1;" onkeydown="if(event.key==='Enter') addNewClass()">
                <button class="btn-primary" onclick="addNewClass()">+ Add</button>
            </div>

            <div class="preset-grid" id="presets-container" style="height:120px; max-height:120px; overflow-y:auto;"></div>

            <!-- Custom Box Type Manager -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:3px;">
                <label>Add New Box Type:</label>
            </div>
            <div class="class-mgr">
                <select id="new-box-emoji" style="width:55px; padding:3px 4px; font-size:0.75rem;">
                    <option value="☑️">☑️</option>
                    <option value="✍️">✍️</option>
                    <option value="📋">📋</option>
                    <option value="✒️">✒️</option>
                    <option value="🔘">🔘</option>
                    <option value="📊">📊</option>
                    <option value="🔖">🔖</option>
                    <option value="🏷️">🏷️</option>
                    <option value="📝">📝</option>
                    <option value="📌">📌</option>
                </select>
                <input type="text" id="new-box-type-input" placeholder="Box type name..." style="flex:1;" onkeydown="if(event.key==='Enter') addNewBoxType()">
                <button class="btn-primary" onclick="addNewBoxType()">+ Add Type</button>
            </div>
        </div>

        <!-- 3. BOXES LIST WITH SEARCH & DELETE ALL -->
        <div class="boxes-list-container">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <label>Boxes (<span id="box-count">0</span>):</label>
                <div style="display:flex; gap:3px;">
                    <button class="btn-secondary" style="padding:2px 6px; font-size:0.68rem;" onclick="copySelectedBoxes()" title="Copy boxes (Ctrl+C)">📋 Copy</button>
                    <button id="sidebar-btn-paste" class="btn-secondary" style="padding:2px 6px; font-size:0.68rem; opacity:0.5;" onclick="pasteBoxes()" title="Paste boxes (Ctrl+V)">📥 Paste</button>
                    <button class="btn-primary" style="padding:2px 6px; font-size:0.68rem; background:#0284c7;" onclick="openCopyBoxesModal()" title="Copy & adapt bounding boxes from another document (e.g. from case_p_001 to case_s_001)">From Doc...</button>
                    <button class="btn-danger" style="padding:2px 6px; font-size:0.68rem;" onclick="clearBoxes()" title="Delete all boxes">🗑️</button>
                </div>
            </div>
            <input type="text" id="search-boxes-input" placeholder="🔍 Search box label..." oninput="filterBoxesList()" style="margin:2px 0; padding:2px 6px; font-size:0.7rem;">
            <div class="boxes-list" id="boxes-list"></div>
        </div>

        <!-- 4. CUSTOMIZABLE SAVE & EXPORT PATHS (WITH FOLDER / PRESET SELECTOR BUTTONS) -->
        <div class="export-panel">
            <div class="checkbox-group" style="flex-wrap:wrap; gap:8px;">
                <label><input type="checkbox" id="opt-export-csv" checked> Detection CSV</label>
                <label><input type="checkbox" id="opt-export-ocr" checked> 📝 OCR Transcription CSV</label>
                <label><input type="checkbox" id="opt-export-img" checked> Render JPG</label>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:4px;">
                <label>Target Detection CSV (Ground Truth):</label>
                <input type="text" id="custom-csv-path" list="csv-path-options" value="data/interim/document_processing/ground_truth_annotations/text_detection_annotations.csv" placeholder="Type or pick CSV path...">
                <datalist id="csv-path-options">
                    <option value="data/interim/document_processing/ground_truth_annotations/text_detection_annotations.csv">
                </datalist>

                <label style="margin-top:2px;">Target OCR CSV (Ground Truth):</label>
                <input type="text" id="custom-ocr-csv-path" list="ocr-csv-path-options" value="data/interim/document_processing/ground_truth_annotations/ocr_transcription_annotations.csv" placeholder="Type or pick OCR CSV path...">
                <datalist id="ocr-csv-path-options">
                    <option value="data/interim/document_processing/ground_truth_annotations/ocr_transcription_annotations.csv">
                </datalist>
                
                <label style="margin-top:2px;">Target Image Folder (Editable Option):</label>
                <input type="text" id="custom-img-dir" list="folder-dir-options" value="data/interim/document_processing/bounding_box_visualizations" placeholder="Type or select image folder...">
                <datalist id="folder-dir-options">
                    <option value="data/interim/document_processing/bounding_box_visualizations">
                    <option value="data/interim/document_processing/bounding_box_visualizations/physical_capture">
                    <option value="data/interim/document_processing/bounding_box_visualizations/scan_capture">
                </datalist>
            </div>

            <div style="display:flex; gap:6px; margin-top:4px;">
                <button class="btn-success" style="flex:1; padding:7px;" onclick="triggerSaveExport(true)" title="Save & Export annotations to CSV and images (Shortcut: Ctrl+S)">💾 Save & Export <span style="opacity:0.8; font-size:0.68rem; font-weight:normal;">[Ctrl+S]</span></button>
            </div>
        </div>
    </div>

    <!-- CANVAS WORKSPACE -->
    <div id="workspace">
        <!-- FLOATING ZOOM, PAN & EYE VISIBILITY TOOLBAR -->
        <div id="zoom-toolbar" class="zoom-toolbar">
            <button id="btn-collapse-toolbar" class="collapse-btn" onclick="toggleToolbarCollapse()" title="Collapse / Expand Toolbar">
                <span id="collapse-icon">◀</span>
            </button>
            <div id="toolbar-content" class="toolbar-content" style="display:flex; gap:6px; align-items:center;">
                <!-- Mode Switcher -->
                <button id="btn-mode-draw" class="btn-secondary active" onclick="setAppMode('draw')" title="Draw Box Mode (Shortcut: D)">✏️ Draw</button>
                <button id="btn-mode-drag" class="btn-secondary" onclick="setAppMode('drag')" title="Select & Drag Single Box Mode (Shortcut: V)">✋ Drag/Move</button>
                <button id="btn-mode-drag-all" class="btn-secondary" onclick="setAppMode('drag_all')" title="Drag ALL Boxes Mode: Click & drag anywhere on canvas to move every box together without creating boxes (Shortcut: A)" style="font-weight:600; color:#38bdf8;">✥ Drag ALL Boxes</button>

                <span class="divider"></span>

                <!-- Zoom -->
                <button class="btn-secondary" onclick="changeZoom(-0.15)">➖</button>
                <span id="zoom-level-text">100%</span>
                <button class="btn-secondary" onclick="changeZoom(0.15)">➕</button>
                <button class="btn-secondary" onclick="resetZoom()">Reset</button>

                <span class="divider"></span>

                <!-- Visibility Toggles -->
                <button id="btn-toggle-boxes" class="btn-secondary" onclick="toggleBoundingBoxesVisibility()" title="Toggle Bounding Boxes Visibility (Shortcut: 'H')" style="display:flex; align-items:center; gap:4px; color:#38bdf8;">
                    <span id="eye-icon">👁️</span> <span id="eye-text">Boxes: ON</span>
                </button>
                <button id="btn-toggle-labels" class="btn-secondary" onclick="toggleLabelsVisibility()" title="Toggle Class Name Labels (Boxes Only, Hide Text Badges) (Shortcut: 'L')" style="display:flex; align-items:center; gap:4px; color:#a855f7;">
                    <span id="label-icon">🏷️</span> <span id="label-text">Labels: ON</span>
                </button>

                <span class="divider"></span>

                <!-- Undo / Redo -->
                <button id="btn-undo" class="btn-secondary" onclick="undo()" title="Undo (Ctrl+Z)" disabled>↩️ Undo</button>
                <button id="btn-redo" class="btn-secondary" onclick="redo()" title="Redo (Ctrl+Y or Ctrl+Shift+Z)" disabled>↪️ Redo</button>

                <span class="divider"></span>

                <!-- Copy / Paste Boxes -->
                <button id="btn-copy-boxes" class="btn-secondary" onclick="copySelectedBoxes()" title="Copy Selected (or All) Boxes (Ctrl+C)" style="display:flex; align-items:center; gap:3px;">
                    <span>📋</span> <span>Copy</span>
                </button>
                <button id="btn-paste-boxes" class="btn-secondary" onclick="pasteBoxes()" title="Paste Boxes to Document (Ctrl+V)" style="display:flex; align-items:center; gap:3px; opacity:0.5;">
                    <span>📥</span> <span>Paste</span>
                </button>

                <span class="divider"></span>

                <!-- Physical <-> Scan Counterpart Transfer -->
                <button id="btn-counterpart-copy" class="btn-ai" style="display:none; padding:4px 9px;" onclick="copyToCounterpart()"></button>
                <button id="btn-counterpart-batch" class="btn-secondary" style="display:none; padding:4px 8px; font-weight:600; color:#38bdf8;" onclick="openBatchCounterpartModal()" title="Copy all files in this folder between Physical and Scan">🔄 Copy All in Folder</button>
                <button id="btn-counterpart-jump" class="btn-secondary" style="display:none; padding:4px 7px;" onclick="jumpToCounterpart()" title="Switch to counterpart document">🔀 Switch</button>
            </div>
        </div>


        <div id="canvas-wrapper">
            <canvas id="docCanvas"></canvas>
        </div>
        
        <div class="status-bar">
            <div id="image-info">Loading...</div>
            <div id="manip-info" style="color:#00e5ff; font-weight:600;">Shortcuts: [Ctrl+S = Save] [A = Drag ALL Boxes] [V = Drag/Select] [D = Draw] [Arrows = Nudge] [H = Hide Boxes] [L = Hide Labels] [Ctrl+Z = Undo] [Ctrl+Y = Redo] [Ctrl+C = Copy] [Ctrl+V = Paste] [Ctrl+Right-Click = Multi-Select] [Space+Drag = Pan]</div>
            <div id="save-status">Ready</div>
        </div>
    </div>

    <!-- BATCH COUNTERPART TRANSFER MODAL -->
    <div id="batch-counterpart-modal" class="modal-overlay" onclick="if(event.target===this) closeBatchCounterpartModal()">
        <div class="modal-card">
            <div class="modal-header">
                <h2>🔄 Batch Counterpart Transfer <span style="font-size:0.75rem; color:#94a3b8; font-weight:normal;">(Physical ⇄ Scan)</span></h2>
                <button class="modal-close" onclick="closeBatchCounterpartModal()">✕</button>
            </div>

            <div style="display:flex; flex-direction:column; gap:4px;">
                <label>Select Category / Document Type:</label>
                <select id="batch-category-select" onchange="loadBatchCounterpartSummary()"></select>
            </div>

            <div style="display:flex; flex-direction:column; gap:4px;">
                <label>Transfer Direction (Pwede Both):</label>
                <div class="direction-toggle-group">
                    <div id="dir-card-p2s" class="direction-card active" onclick="setBatchDirection('physical_to_scan')">
                        <div class="dir-title">📷 Physical ➡️ 🖨️ Scan</div>
                        <div class="dir-desc">Copy all ground truth annotations from Physical Capture to Scan Capture files in this category</div>
                    </div>
                    <div id="dir-card-s2p" class="direction-card" onclick="setBatchDirection('scan_to_physical')">
                        <div class="dir-title">🖨️ Scan ➡️ 📷 Physical</div>
                        <div class="dir-desc">Copy all ground truth annotations from Scan Capture to Physical Capture files in this category</div>
                    </div>
                </div>
            </div>

            <div class="counterpart-summary-box" id="batch-summary-box">
                <div style="text-align:center; color:#94a3b8; padding:8px;">Loading counterpart statistics...</div>
            </div>

            <div style="display:flex; flex-direction:column; gap:6px;">
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; color:#cbd5e1; font-size:0.75rem;">
                    <input type="checkbox" id="batch-opt-overwrite" checked>
                    <span><strong>Overwrite existing target annotations</strong> (sync & replace target with clean ground truth)</span>
                </label>
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; color:#cbd5e1; font-size:0.75rem;">
                    <input type="checkbox" id="batch-opt-render-img" checked>
                    <span>Generate rendered visualization JPGs with bounding boxes</span>
                </label>
            </div>

            <div id="batch-progress-container" style="display:none; background:#0f172a; border-radius:6px; padding:10px; border:1px solid #334155;">
                <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:0.75rem;">
                    <span id="batch-progress-text" style="color:#38bdf8; font-weight:600;">Processing...</span>
                </div>
                <div style="background:#1e293b; border-radius:4px; height:8px; overflow:hidden;">
                    <div id="batch-progress-bar" style="background:linear-gradient(90deg, #38bdf8, #818cf8); height:100%; width:100%; animation: pulse-bar 1.5s infinite;"></div>
                </div>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:6px; border-top:1px solid #334155; padding-top:12px;">
                <button class="btn-secondary" onclick="closeBatchCounterpartModal()">Cancel</button>
                <button id="btn-start-batch-transfer" class="btn-ai" style="padding:7px 15px; font-weight:bold;" onclick="executeBatchCounterpartCopy()">
                    🚀 Start Batch Transfer
                </button>
            </div>
        </div>
    </div>

    <!-- COPY / CLONE BOUNDING BOXES MODAL DIALOG -->
    <div id="copy-boxes-modal" class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h3>📋 Copy Bounding Boxes From Document</h3>
                <button class="modal-close" onclick="closeCopyBoxesModal()">&times;</button>
            </div>
            <div style="font-size:0.75rem; color:#cbd5e1; line-height:1.4;">
                Copy all bounding boxes from a reference document (e.g., from <strong style="color:#38bdf8;">case_p_001</strong> to <strong style="color:#38bdf8;">case_s_001</strong>). Dimensions are automatically scaled proportionally to fit this target document.
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
                <label>Target Document (Current):</label>
                <input type="text" id="copy-target-display" disabled style="background:#0b1120; color:#38bdf8; font-weight:bold;">
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
                <label>Select Source Document to Copy From:</label>
                <select id="copy-source-select" style="max-height:140px;"></select>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px; margin-top:4px;">
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; color:#e2e8f0; font-size:0.75rem;">
                    <input type="checkbox" id="copy-include-text" checked>
                    <span>Also copy ground truth transcriptions & labels</span>
                </label>
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; color:#e2e8f0; font-size:0.75rem;">
                    <input type="checkbox" id="copy-replace-existing" checked>
                    <span>Replace existing boxes on current document (uncheck to append)</span>
                </label>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:8px;">
                <button class="btn-secondary" onclick="closeCopyBoxesModal()">Cancel</button>
                <button class="btn-success" onclick="executeCopyBoxes()">📋 Copy & Apply Boxes</button>
            </div>
        </div>
    </div>

    <script>
        let allImages = [];
        let filteredImages = [];
        let currentIndex = 0;
        let currentBoxes = [];
        let selectedBoxIndex = -1;
        let selectedBoxIndices = []; // Multi-box selection set
        let originalImgWidth = 0;
        let originalImgHeight = 0;
        let baseDisplayScale = 1.0;
        let userZoom = 1.0; // Zoom multiplier (1.0 = 100%)
        let allPresets = [];
        let allBoxTypes = [];
        let toastTimeout = null;
        let statusFilter = 'ALL'; // 'ALL', 'ANNOTATED', 'PENDING'
        let showBoundingBoxes = true; // Eye mode toggle for showing/hiding boxes
        let showLabels = true; // Toggle for showing/hiding label pills (class name text badges)
        let isMarqueeActive = false; // Multi-select marquee drag state
        let marqueeStart = { x: 0, y: 0 };
        let marqueeCurrent = { x: 0, y: 0 };
        
        // --- UNDO / REDO HISTORY STACKS ---
        let undoStack = [];
        let redoStack = [];
        const MAX_HISTORY_STEPS = 40;

        // --- CLIPBOARD FOR COPY & PASTE BOXES (SYNCED ACROSS BROWSER TABS VIA LOCALSTORAGE) ---
        const CLIPBOARD_STORAGE_KEY = 'ofphil_annotator_box_clipboard';
        let boxClipboard = [];
        let clipboardImgWidth = 0;
        let clipboardImgHeight = 0;

        function loadClipboardFromStorage() {
            try {
                const stored = localStorage.getItem(CLIPBOARD_STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed && Array.isArray(parsed.boxes)) {
                        boxClipboard = parsed.boxes;
                        clipboardImgWidth = parsed.imgWidth || 0;
                        clipboardImgHeight = parsed.imgHeight || 0;
                        return true;
                    }
                }
            } catch (err) {
                console.warn("Could not read clipboard from localStorage:", err);
            }
            return false;
        }

        function saveClipboardToStorage(boxes, width, height) {
            try {
                const payload = {
                    boxes: boxes,
                    imgWidth: width,
                    imgHeight: height,
                    timestamp: Date.now()
                };
                localStorage.setItem(CLIPBOARD_STORAGE_KEY, JSON.stringify(payload));
            } catch (err) {
                console.warn("Could not write clipboard to localStorage:", err);
            }
        }

        // Initialize clipboard from localStorage on page load
        loadClipboardFromStorage();

        // Listen for storage events so copying in one tab updates paste status in other tabs immediately
        window.addEventListener('storage', (e) => {
            if (e.key === CLIPBOARD_STORAGE_KEY) {
                loadClipboardFromStorage();
                updateClipboardButtons();
            }
        });

        
        // --- NEW INTERACTIVE FEATURE STATES ---
        let appMode = 'draw'; // 'draw' or 'drag'
        let showBoxes = true;
        const MAX_HISTORY = 50;
        let currentCounterpart = null;
        
        // Curated distinct vibrant color palette for different classes
        const DISTINCT_PALETTE = [
            '#00e5ff', // Cyan
            '#f59e0b', // Amber / Orange
            '#10b981', // Emerald Green
            '#ec4899', // Pink / Magenta
            '#8b5cf6', // Violet
            '#06b6d4', // Teal
            '#e11d48', // Rose Red
            '#84cc16', // Lime
            '#3b82f6', // Bright Blue
            '#d946ef', // Fuchsia
            '#14b8a6', // Turquoise
            '#f97316'  // Deep Orange
        ];

        function getColorForLabel(labelName) {
            if (!labelName) return DISTINCT_PALETTE[0];
            let hash = 0;
            for (let i = 0; i < labelName.length; i++) {
                hash = labelName.charCodeAt(i) + ((hash << 5) - hash);
            }
            const idx = Math.abs(hash) % DISTINCT_PALETTE.length;
            return DISTINCT_PALETTE[idx];
        }

        const THEME_CYAN = '#00e5ff';

        const canvas = document.getElementById('docCanvas');
        const canvasWrapper = document.getElementById('canvas-wrapper');
        const ctx = canvas.getContext('2d');
        const activeLabelInput = document.getElementById('active-label');
        const searchInput = document.getElementById('search-class');
        const searchBoxesInput = document.getElementById('search-boxes-input');
        const presetsContainer = document.getElementById('presets-container');
        const saveStatus = document.getElementById('save-status');
        const zoomText = document.getElementById('zoom-level-text');

        let interactionMode = 'draw';
        let resizeHandle = '';
        let isInteracting = false;
        let startX = 0, startY = 0;
        let origBoxState = null;
        let origBoxesSnapshot = null;
        let img = new Image();

        // Spacebar panning state
        let isSpacePressed = false;
        let isPanning = false;
        let panStartX = 0, panStartY = 0;
        let scrollStartLeft = 0, scrollStartTop = 0;

        function showToast(msg, isError = false) {
            const toast = document.getElementById('toast');
            document.getElementById('toast-msg').innerText = msg;
            document.getElementById('toast-icon').innerText = isError ? '⚠️' : '✅';
            toast.className = isError ? 'toast-error show' : 'show';
            if (toastTimeout) clearTimeout(toastTimeout);
            toastTimeout = setTimeout(() => { toast.classList.remove('show'); }, 2200);
        }

        // --- UNDO / REDO SYSTEM ---
        function pushHistory() {
            undoStack.push({
                boxes: JSON.parse(JSON.stringify(currentBoxes)),
                selectedIndex: selectedBoxIndex
            });
            if (undoStack.length > MAX_HISTORY) undoStack.shift();
            redoStack = []; // Clear redo stack on new action
            updateUndoRedoUI();
        }

        function updateUndoRedoUI() {
            const btnUndo = document.getElementById('btn-undo');
            const btnRedo = document.getElementById('btn-redo');
            if (btnUndo) btnUndo.disabled = (undoStack.length === 0);
            if (btnRedo) btnRedo.disabled = (redoStack.length === 0);
        }

        function undo() {
            if (undoStack.length === 0) {
                showToast("Nothing to undo", true);
                return;
            }
            redoStack.push({
                boxes: JSON.parse(JSON.stringify(currentBoxes)),
                selectedIndex: selectedBoxIndex
            });
            const prev = undoStack.pop();
            currentBoxes = prev.boxes;
            selectedBoxIndex = (prev.selectedIndex < currentBoxes.length) ? prev.selectedIndex : -1;
            isDirty = true;
            redraw();
            updateBoxesList();
            updateUndoRedoUI();
            showToast("Undone ↩️");
        }

        function redo() {
            if (redoStack.length === 0) {
                showToast("Nothing to redo", true);
                return;
            }
            undoStack.push({
                boxes: JSON.parse(JSON.stringify(currentBoxes)),
                selectedIndex: selectedBoxIndex
            });
            const next = redoStack.pop();
            currentBoxes = next.boxes;
            selectedBoxIndex = (next.selectedIndex < currentBoxes.length) ? next.selectedIndex : -1;
            isDirty = true;
            redraw();
            updateBoxesList();
            updateUndoRedoUI();
            showToast("Redone ↪️");
        }

        // --- VISIBILITY & MODE TOGGLES ---
        function toggleShowBoxes() {
            showBoxes = !showBoxes;
            const btn = document.getElementById('btn-toggle-boxes');
            if (btn) {
                btn.classList.toggle('active', showBoxes);
                btn.innerText = showBoxes ? '👁️ Boxes' : '🙈 Boxes (Off)';
            }
            redraw();
            showToast(showBoxes ? 'Bounding boxes visible' : 'Bounding boxes hidden');
        }

        function toggleShowLabels() {
            showLabels = !showLabels;
            const btn = document.getElementById('btn-toggle-labels');
            if (btn) {
                btn.classList.toggle('active', showLabels);
                btn.innerText = showLabels ? '🏷️ Labels' : '🏷️ Labels (Off)';
            }
            redraw();
            showToast(showLabels ? 'Name labels visible' : 'Name labels hidden');
        }

        function setAppMode(mode) {
            appMode = mode;
            const btnDraw = document.getElementById('btn-mode-draw');
            const btnDrag = document.getElementById('btn-mode-drag');
            const btnDragAll = document.getElementById('btn-mode-drag-all');
            if (btnDraw) btnDraw.classList.toggle('active', appMode === 'draw');
            if (btnDrag) btnDrag.classList.toggle('active', appMode === 'drag');
            if (btnDragAll) btnDragAll.classList.toggle('active', appMode === 'drag_all');

            if (appMode === 'drag_all') {
                canvas.style.cursor = 'move';
                showToast('✥ Drag ALL Boxes Mode active (A): Click and drag anywhere to move all boxes together!');
            } else if (appMode === 'drag') {
                canvas.style.cursor = 'default';
                showToast('✋ Drag / Move Mode active (V): Click and move individual boxes');
            } else {
                canvas.style.cursor = 'crosshair';
                showToast('✏️ Draw Box Mode active (D): Click and drag to create boxes');
            }
        }

        function isInputFocused() {
            const tag = (document.activeElement && document.activeElement.tagName) || '';
            return ['INPUT', 'SELECT', 'TEXTAREA'].includes(tag);
        }

        function nudgeBox(key, step = 1) {
            if (selectedBoxIndex < 0 || selectedBoxIndex >= currentBoxes.length) return;
            pushHistory();
            const b = currentBoxes[selectedBoxIndex];
            if (key === 'ArrowUp') b.bbox_y = Math.max(0, b.bbox_y - step);
            else if (key === 'ArrowDown') b.bbox_y = Math.min(originalImgHeight - b.bbox_height, b.bbox_y + step);
            else if (key === 'ArrowLeft') b.bbox_x = Math.max(0, b.bbox_x - step);
            else if (key === 'ArrowRight') b.bbox_x = Math.min(originalImgWidth - b.bbox_width, b.bbox_x + step);
            isDirty = true;
            redraw();
            updateBoxesList();
        }

        // --- KEYBOARD SHORTCUTS ---
        window.addEventListener('keydown', (e) => {
            // Save & Export: Ctrl+S / Cmd+S (works anywhere, even if an input field is focused)
            if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
                e.preventDefault();
                if (document.activeElement && typeof document.activeElement.blur === 'function') {
                    document.activeElement.blur();
                }
                triggerSaveExport(true);
                return;
            }

            // Spacebar for panning
            if (e.code === 'Space' && !isInputFocused()) {
                if (!isSpacePressed) {
                    isSpacePressed = true;
                    canvas.style.cursor = 'grab';
                }
                e.preventDefault();
                return;
            }

            // Undo: Ctrl+Z / Cmd+Z (without shift)
            if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey && !isInputFocused()) {
                e.preventDefault();
                undo();
                return;
            }

            // Redo: Ctrl+Y / Cmd+Y or Ctrl+Shift+Z
            if (((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y') || ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && e.shiftKey)) && !isInputFocused()) {
                e.preventDefault();
                redo();
                return;
            }

            // Hide/Show Boxes Toggle: H
            if ((e.key === 'h' || e.key === 'H') && !isInputFocused() && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                toggleShowBoxes();
                return;
            }

            // Hide/Show Labels Toggle: L
            if ((e.key === 'l' || e.key === 'L') && !isInputFocused() && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                toggleShowLabels();
                return;
            }

            // Draw Mode: D
            if ((e.key === 'd' || e.key === 'D') && !isInputFocused() && !e.ctrlKey && !e.metaKey) {
                setAppMode('draw');
                return;
            }

            // Drag/Select Single Box Mode: V
            if ((e.key === 'v' || e.key === 'V') && !isInputFocused() && !e.ctrlKey && !e.metaKey) {
                setAppMode('drag');
                return;
            }

            // Drag ALL Boxes Mode: A
            if ((e.key === 'a' || e.key === 'A') && !isInputFocused() && !e.ctrlKey && !e.metaKey) {
                setAppMode('drag_all');
                return;
            }

            // Arrow keys for nudging selected box
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !isInputFocused()) {
                if (selectedBoxIndex >= 0 && selectedBoxIndex < currentBoxes.length) {
                    nudgeBox(e.key, e.shiftKey ? 10 : 1);
                    e.preventDefault();
                    return;
                }
            }

            // Delete / Backspace to remove currently selected bounding box
            if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputFocused()) {
                if (selectedBoxIndex >= 0 && selectedBoxIndex < currentBoxes.length) {
                    deleteSelectedBox();
                    e.preventDefault();
                    return;
                }
            }

            // 'H' key to toggle Eye Mode (hide/show bounding boxes)
            if ((e.key === 'h' || e.key === 'H') && !['INPUT', 'SELECT'].includes(document.activeElement.tagName)) {
                toggleBoundingBoxesVisibility();
                e.preventDefault();
            }

            // 'L' key to toggle Labels visibility (show only boxes, hide label text)
            if ((e.key === 'l' || e.key === 'L') && !['INPUT', 'SELECT'].includes(document.activeElement.tagName)) {
                toggleLabelsVisibility();
                e.preventDefault();
            }

            // Undo: Ctrl+Z (without Shift)
            if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                undo();
                e.preventDefault();
            }

            // Redo: Ctrl+Y or Ctrl+Shift+Z
            if ((e.ctrlKey || e.metaKey) && ((e.key === 'y' || e.key === 'Y') || ((e.key === 'z' || e.key === 'Z') && e.shiftKey)) && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                redo();
                e.preventDefault();
            }

            // Copy Bounding Boxes: Ctrl+C (when not editing input or text fields)
            if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C') && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                copySelectedBoxes();
                e.preventDefault();
            }

            // Paste Bounding Boxes: Ctrl+V (when not editing input or text fields)
            if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V') && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                pasteBoxes();
                e.preventDefault();
            }
        });


        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                isSpacePressed = false;
                isPanning = false;
                canvas.style.cursor = appMode === 'drag' ? 'default' : 'crosshair';
            }
        });

        // --- CTRL + MOUSE WHEEL ZOOM ---
        canvasWrapper.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                const zoomFactor = e.deltaY < 0 ? 0.12 : -0.12;
                changeZoom(zoomFactor);
            }
        }, { passive: false });

        function changeZoom(delta) {
            userZoom = Math.min(3.0, Math.max(0.4, userZoom + delta));
            zoomText.innerText = `${Math.round(userZoom * 100)}%`;
            applyCanvasDimensions();
            redraw();
        }

        function resetZoom() {
            userZoom = 1.0;
            zoomText.innerText = `100%`;
            applyCanvasDimensions();
            redraw();
        }

        // --- EYE MODE TOGGLE (SHOW / HIDE BOUNDING BOXES) ---
        function toggleBoundingBoxesVisibility() {
            showBoundingBoxes = !showBoundingBoxes;
            const btn = document.getElementById('btn-toggle-boxes');
            const icon = document.getElementById('eye-icon');
            const text = document.getElementById('eye-text');

            if (showBoundingBoxes) {
                icon.innerText = '👁️';
                text.innerText = 'Boxes: ON';
                btn.style.color = '#38bdf8';
                btn.classList.remove('active');
                showToast("Bounding boxes visible");
            } else {
                icon.innerText = '🙈';
                text.innerText = 'Boxes: HIDDEN';
                btn.style.color = '#f59e0b';
                btn.classList.add('active');
                showToast("Eye Mode: Bounding boxes hidden for clear reading");
            }
            redraw();
        }

        // --- TOGGLE CLASS NAME LABELS (SHOW ONLY BOXES, HIDE LABELS) ---
        function toggleLabelsVisibility() {
            showLabels = !showLabels;
            const btn = document.getElementById('btn-toggle-labels');
            const icon = document.getElementById('label-icon');
            const text = document.getElementById('label-text');

            if (showLabels) {
                icon.innerText = '🏷️';
                text.innerText = 'Labels: ON';
                btn.style.color = '#a855f7';
                btn.classList.remove('active');
                showToast("Class labels visible");
            } else {
                icon.innerText = '🔲';
                text.innerText = 'Boxes Only (Labels: OFF)';
                btn.style.color = '#ec4899';
                btn.classList.add('active');
                showToast("Clean Mode: Class name labels hidden (boxes only)");
            }
            redraw();
        }

        // --- TOGGLE TOOLBAR COLLAPSE ---
        let isToolbarCollapsed = false;
        function toggleToolbarCollapse() {
            isToolbarCollapsed = !isToolbarCollapsed;
            const toolbar = document.getElementById('zoom-toolbar');
            const icon = document.getElementById('collapse-icon');
            const btn = document.getElementById('btn-collapse-toolbar');
            
            if (isToolbarCollapsed) {
                toolbar.classList.add('collapsed');
                icon.innerText = '▶';
                btn.title = 'Expand Toolbar';
            } else {
                toolbar.classList.remove('collapsed');
                icon.innerText = '◀';
                btn.title = 'Collapse Toolbar';
            }
        }

        // --- UNDO & REDO CONTROLLER ---
        function pushHistory() {
            // Snapshot deep clone of current boxes state
            const snapshot = JSON.stringify(currentBoxes);
            // Don't push duplicate snapshots
            if (undoStack.length > 0 && undoStack[undoStack.length - 1] === snapshot) {
                return;
            }
            undoStack.push(snapshot);
            if (undoStack.length > MAX_HISTORY_STEPS) {
                undoStack.shift();
            }
            // A new action invalidates forward redo history
            redoStack = [];
            updateUndoRedoButtons();
        }

        function undo() {
            if (undoStack.length === 0) {
                showToast("Nothing to undo", true);
                return;
            }
            // Save current state to redoStack before restoring
            const currentState = JSON.stringify(currentBoxes);
            redoStack.push(currentState);

            // Pop previous state
            const previousState = undoStack.pop();
            try {
                currentBoxes = JSON.parse(previousState);
                selectedBoxIndex = -1;
                selectedBoxIndices = [];
                isDirty = true;
                redraw();
                updateBoxesList();
                updateUndoRedoButtons();
                showToast("Undo ↩️");
            } catch (err) {
                console.error("Undo error:", err);
            }
        }

        function redo() {
            if (redoStack.length === 0) {
                showToast("Nothing to redo", true);
                return;
            }
            // Save current state to undoStack before moving forward
            const currentState = JSON.stringify(currentBoxes);
            undoStack.push(currentState);

            // Pop next state
            const nextState = redoStack.pop();
            try {
                currentBoxes = JSON.parse(nextState);
                selectedBoxIndex = -1;
                selectedBoxIndices = [];
                isDirty = true;
                redraw();
                updateBoxesList();
                updateUndoRedoButtons();
                showToast("Redo ↪️");
            } catch (err) {
                console.error("Redo error:", err);
            }
        }

        function updateUndoRedoButtons() {
            const btnUndo = document.getElementById('btn-undo');
            const btnRedo = document.getElementById('btn-redo');
            if (btnUndo) {
                btnUndo.style.opacity = undoStack.length > 0 ? "1" : "0.5";
                btnUndo.title = `Undo action (Ctrl+Z) [${undoStack.length} available]`;
            }
            if (btnRedo) {
                btnRedo.style.opacity = redoStack.length > 0 ? "1" : "0.5";
                btnRedo.title = `Redo action (Ctrl+Y) [${redoStack.length} available]`;
            }
            updateClipboardButtons();
        }

        // --- CLIPBOARD (COPY & PASTE) CONTROLLER ---
        function updateClipboardButtons() {
            const btnPaste = document.getElementById('btn-paste-boxes');
            const sidebarBtnPaste = document.getElementById('sidebar-btn-paste');
            const hasBoxesInClip = boxClipboard && boxClipboard.length > 0;
            const countText = hasBoxesInClip ? ` (${boxClipboard.length})` : '';

            if (btnPaste) {
                btnPaste.style.opacity = hasBoxesInClip ? "1" : "0.5";
                btnPaste.title = hasBoxesInClip ? `Paste ${boxClipboard.length} copied box(es) (Ctrl+V)` : "Paste Boxes to Document (Ctrl+V) [Clipboard Empty]";
            }
            if (sidebarBtnPaste) {
                sidebarBtnPaste.style.opacity = hasBoxesInClip ? "1" : "0.5";
                sidebarBtnPaste.title = hasBoxesInClip ? `Paste ${boxClipboard.length} box(es) (Ctrl+V)` : "Paste boxes (Ctrl+V)";
                sidebarBtnPaste.innerText = `📥 Paste${countText}`;
            }
        }

        function copySelectedBoxes() {
            if (!currentBoxes || currentBoxes.length === 0) {
                showToast("No bounding boxes to copy!", true);
                return;
            }

            let indicesToCopy = [];
            if (selectedBoxIndices && selectedBoxIndices.length > 0) {
                indicesToCopy = [...selectedBoxIndices];
            } else if (selectedBoxIndex >= 0 && selectedBoxIndex < currentBoxes.length) {
                indicesToCopy = [selectedBoxIndex];
            } else {
                // If nothing is explicitly selected, copy ALL boxes on the current image
                indicesToCopy = currentBoxes.map((_, idx) => idx);
            }

            if (indicesToCopy.length === 0) {
                showToast("No boxes selected to copy!", true);
                return;
            }

            // Deep clone selected boxes and snapshot source image dimensions
            boxClipboard = indicesToCopy.map(idx => {
                const b = currentBoxes[idx];
                return {
                    bbox_x: b.bbox_x,
                    bbox_y: b.bbox_y,
                    bbox_width: b.bbox_width,
                    bbox_height: b.bbox_height,
                    label_name: b.label_name || 'unlabeled',
                    box_type: b.box_type || 'FORM_SECTION',
                    transcription_text: (b.transcription_text !== undefined) ? b.transcription_text : '',
                    transcription_quality_notes: b.transcription_quality_notes || ''
                };
            });

            clipboardImgWidth = originalImgWidth || (currentBoxes[0] ? currentBoxes[0].image_width : 0);
            clipboardImgHeight = originalImgHeight || (currentBoxes[0] ? currentBoxes[0].image_height : 0);

            // Persist to localStorage so other browser tabs can access the copied boxes
            saveClipboardToStorage(boxClipboard, clipboardImgWidth, clipboardImgHeight);

            updateClipboardButtons();
            const plural = boxClipboard.length > 1 ? `${boxClipboard.length} boxes` : `1 box (${boxClipboard[0].label_name})`;
            showToast(`📋 Copied ${plural} to clipboard! Switch to any tab/image and press Ctrl+V to paste.`);
        }

        function pasteBoxes() {
            // Always sync latest clipboard from localStorage (covers cross-tab copies)
            loadClipboardFromStorage();

            if (!boxClipboard || boxClipboard.length === 0) {
                showToast("Clipboard is empty! Press Ctrl+C to copy boxes first.", true);
                return;
            }

            if (!originalImgWidth || !originalImgHeight) {
                showToast("Cannot paste: document image is not loaded yet.", true);
                return;
            }

            pushHistory(); // Record state for Undo

            // Compute scaling factors between source and target image
            let scaleX = 1.0;
            let scaleY = 1.0;
            if (clipboardImgWidth > 0 && clipboardImgHeight > 0) {
                scaleX = originalImgWidth / clipboardImgWidth;
                scaleY = originalImgHeight / clipboardImgHeight;
            }

            // If pasting onto the exact same image with 1:1 scale, add a slight offset (+15px) so duplicate is visible
            const isSameImageDimensions = Math.abs(scaleX - 1.0) < 0.001 && Math.abs(scaleY - 1.0) < 0.001;
            const offset = (isSameImageDimensions && currentBoxes.length > 0) ? 15 : 0;

            const startIndex = currentBoxes.length;
            const newIndices = [];

            boxClipboard.forEach((b, i) => {
                let newX = Math.round(b.bbox_x * scaleX) + offset;
                let newY = Math.round(b.bbox_y * scaleY) + offset;
                let newW = Math.round(b.bbox_width * scaleX);
                let newH = Math.round(b.bbox_height * scaleY);

                // Clamp to boundary of target document
                if (newX < 0) newX = 0;
                if (newY < 0) newY = 0;
                if (newX + newW > originalImgWidth) {
                    newX = Math.max(0, originalImgWidth - newW);
                }
                if (newY + newH > originalImgHeight) {
                    newY = Math.max(0, originalImgHeight - newH);
                }

                currentBoxes.push({
                    bbox_x: newX,
                    bbox_y: newY,
                    bbox_width: newW,
                    bbox_height: newH,
                    label_name: b.label_name || 'unlabeled',
                    box_type: b.box_type || 'FORM_SECTION',
                    transcription_text: b.transcription_text !== undefined ? b.transcription_text : '',
                    transcription_quality_notes: b.transcription_quality_notes || '',
                    image_width: originalImgWidth,
                    image_height: originalImgHeight
                });

                newIndices.push(startIndex + i);
            });

            // Multi-select the newly pasted boxes so the user can easily group-move or adjust them immediately
            selectedBoxIndices = newIndices;
            selectedBoxIndex = newIndices.length > 0 ? newIndices[0] : -1;
            isDirty = true;

            redraw();
            updateBoxesList();

            // Scroll the first newly pasted box into view in the sidebar list
            if (selectedBoxIndex >= 0) {
                setTimeout(() => {
                    const el = document.getElementById(`box-card-${selectedBoxIndex}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 50);
            }

            const plural = boxClipboard.length > 1 ? `${boxClipboard.length} boxes` : `1 box (${boxClipboard[0].label_name})`;
            showToast(`📥 Pasted ${plural}! You can drag/resize them or press Save & Export.`);
        }


        function applyCanvasDimensions() {
            const currentEffectiveScale = baseDisplayScale * userZoom;
            canvas.width = originalImgWidth * currentEffectiveScale;
            canvas.height = originalImgHeight * currentEffectiveScale;
        }

        function getEffectiveScale() {
            return baseDisplayScale * userZoom;
        }

        // --- Preset Class Manager ---
        function loadPresetClasses() {
            fetch('/api/labels')
                .then(res => res.json())
                .then(data => {
                    allPresets = data || [];
                    renderPresets(allPresets);
                })
                .catch(err => {
                    console.error("Failed to load preset classes:", err);
                });
        }

        // --- Box Types Manager ---
        function loadBoxTypes(callback) {
            fetch('/api/box_types')
                .then(res => res.json())
                .then(data => {
                    allBoxTypes = data || [];
                    if (callback) callback();
                    updateBoxesList();
                })
                .catch(err => {
                    console.error("Failed to load box types:", err);
                    allBoxTypes = [
                        {"id": "CHECKMARK_OR_CHECKBOX", "label": "☑️ Checkmark / Checkbox"},
                        {"id": "HANDWRITTEN_ENTRY", "label": "✍️ Handwritten Entry"},
                        {"id": "FORM_SECTION", "label": "📋 Printed Form Section"},
                        {"id": "SIGNATURE", "label": "✒️ Signature"},
                        {"id": "STAMP_OR_SEAL", "label": "🔘 Official Stamp / Seal"},
                        {"id": "TABLE_CELL", "label": "📊 Table Cell"}
                    ];
                    if (callback) callback();
                    updateBoxesList();
                });
        }

        function addNewBoxType() {
            const input = document.getElementById('new-box-type-input');
            const emoji = document.getElementById('new-box-emoji').value;
            const rawName = input.value.trim();
            if (!rawName) return;

            const typeId = rawName.toUpperCase().replace(/\\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
            const typeLabel = `${emoji} ${rawName}`;

            if (allBoxTypes.some(t => t.id === typeId)) {
                showToast(`Box type "${rawName}" already exists!`, true);
                input.value = "";
                return;
            }

            const newTypeObj = { id: typeId, label: typeLabel };
            allBoxTypes.push(newTypeObj);

            fetch('/api/box_types', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ box_types: allBoxTypes })
            })
            .then(res => res.json())
            .then(() => {
                showToast(`Added box type: ${typeLabel}`);
                input.value = "";
                updateBoxesList();
            })
            .catch(err => {
                showToast("Failed to save box type to server", true);
            });
        }

        function renderPresets(list) {
            presetsContainer.innerHTML = "";
            (list || []).forEach(lbl => {
                const chip = document.createElement('div');
                const chipColor = getColorForLabel(lbl);
                const isActive = (activeLabelInput.value === lbl);
                chip.className = "preset-chip" + (isActive ? " active" : "");
                chip.style.backgroundColor = isActive ? chipColor : '#1e293b';
                chip.style.border = `1px solid ${chipColor}`;
                chip.style.color = isActive ? '#000000' : '#f8fafc';
                chip.style.fontWeight = isActive ? '700' : '500';

                const spanName = document.createElement('span');
                spanName.innerText = lbl;
                spanName.style.flex = "1";
                
                chip.onclick = () => setLabel(lbl);
                
                const spanDel = document.createElement('span');
                spanDel.className = "del-chip-btn";
                spanDel.innerText = "✕";
                spanDel.title = "Delete class";
                spanDel.onclick = (e) => {
                    e.stopPropagation();
                    deleteClass(lbl);
                };

                chip.appendChild(spanName);
                chip.appendChild(spanDel);
                presetsContainer.appendChild(chip);
            });
        }

        function filterPresets() {
            const q = searchInput.value.toLowerCase().trim();
            const filtered = allPresets.filter(p => p.toLowerCase().includes(q));
            renderPresets(filtered);
        }

        function setLabel(lbl) {
            activeLabelInput.value = lbl;
            document.getElementById('active-label-badge').innerText = lbl;
            
            if (selectedBoxIndex >= 0 && selectedBoxIndex < currentBoxes.length) {
                currentBoxes[selectedBoxIndex].label_name = lbl;
                isDirty = true;
                redraw();
                updateBoxesList();
                showToast(`Re-labeled box #${selectedBoxIndex+1} to "${lbl}"`);
            }
            // Preserve search filtering if user is searching
            if (searchInput.value.trim() !== '') {
                filterPresets();
            } else {
                renderPresets(allPresets);
            }
        }

        function addNewClass() {
            const input = document.getElementById('new-class-input');
            const newLabel = input.value.trim().toLowerCase().replace(/\\s+/g, '_');
            if (!newLabel) return;
            if (allPresets.includes(newLabel)) {
                showToast(`"${newLabel}" already exists`, true);
                setLabel(newLabel);
                input.value = "";
                return;
            }
            allPresets.unshift(newLabel);
            savePresetClasses(allPresets, () => {
                showToast(`Added class: ${newLabel}`);
                setLabel(newLabel);
                input.value = "";
                filterPresets();
            });
        }

        function deleteClass(lbl) {
            if (confirm(`Delete class "${lbl}" from presets?`)) {
                allPresets = allPresets.filter(p => p !== lbl);
                savePresetClasses(allPresets, () => {
                    showToast(`Deleted class: ${lbl}`);
                    if (activeLabelInput.value === lbl) {
                        setLabel(allPresets[0] || "");
                    }
                    filterPresets();
                });
            }
        }

        function savePresetClasses(list, callback) {
            fetch('/api/labels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ labels: list })
            })
            .then(res => res.json())
            .then(() => { if (callback) callback(); });
        }

        // --- Native Windows File & Folder Pickers (opens File Explorer dialog) ---
        function browseCsvPresets() {
            showToast("Opening File Explorer...");
            // Trigger browser-native picker if user prefers direct browser dialog
            fetch('/api/pick_file?file_type=csv')
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'ok' && data.path) {
                        document.getElementById('custom-csv-path').value = data.path;
                        showToast(`Target CSV set to: ${data.path}`);
                    } else if (data.status === 'cancelled') {
                        // User cancelled dialog
                    } else {
                        document.getElementById('html-csv-picker').click();
                    }
                })
                .catch(() => {
                    document.getElementById('html-csv-picker').click();
                });
        }

        function browseFolderPresets() {
            showToast("Opening Folder Explorer...");
            fetch('/api/pick_folder')
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'ok' && data.path) {
                        document.getElementById('custom-img-dir').value = data.path;
                        showToast(`Target Image folder set to: ${data.path}`);
                    } else if (data.status === 'cancelled') {
                        // User cancelled
                    } else {
                        document.getElementById('html-folder-picker').click();
                    }
                })
                .catch(() => {
                    document.getElementById('html-folder-picker').click();
                });
        }

        function onHtmlCsvSelected(input) {
            if (input.files && input.files.length > 0) {
                const file = input.files[0];
                const suggested = `data/interim/document_processing/${file.name}`;
                document.getElementById('custom-csv-path').value = suggested;
                showToast(`Target CSV set to: ${suggested}`);
            }
        }

        function onHtmlFolderSelected(input) {
            if (input.files && input.files.length > 0) {
                const samplePath = input.files[0].webkitRelativePath || "";
                const folderName = samplePath.split('/')[0] || "bounding_box_visualizations";
                const suggested = `data/interim/document_processing/${folderName}`;
                document.getElementById('custom-img-dir').value = suggested;
                showToast(`Target Folder set to: ${suggested}`);
            }
        }

        // --- Image Loading & Navigation ---
        loadPresetClasses();
        loadBoxTypes();
        updateClipboardButtons();

        function refreshImagesList(targetFileToSelect = null) {
            const customCsv = document.getElementById('custom-csv-path').value.trim();
            fetch(`/api/images?csv_path=${encodeURIComponent(customCsv)}`)
                .then(res => res.json())
                .then(data => {
                    allImages = data || [];
                    populateFolderDropdown();
                    filterImagesByFolder(targetFileToSelect);
                })
                .catch(err => {
                    console.error("Failed to load images:", err);
                });
        }

        refreshImagesList();

        function populateFolderDropdown() {
            const folderSelect = document.getElementById('folder-select');
            const currentSelected = folderSelect.value || 'ALL';
            
            // Map folder -> { total: int, annotated: int }
            const folderStats = {};
            let totalAnnotated = 0;

            allImages.forEach(img => {
                const folderKey = `${img.mode} / ${img.category}`;
                if (!folderStats[folderKey]) {
                    folderStats[folderKey] = { total: 0, annotated: 0 };
                }
                folderStats[folderKey].total += 1;
                if (img.is_annotated) {
                    folderStats[folderKey].annotated += 1;
                    totalAnnotated += 1;
                }
            });

            folderSelect.innerHTML = `<option value="ALL">All Folders (${totalAnnotated}/${allImages.length} saved)</option>`;
            Object.keys(folderStats).sort().forEach(f => {
                const opt = document.createElement('option');
                opt.value = f;
                const stat = folderStats[f];
                opt.innerText = `${f} (${stat.annotated}/${stat.total} saved)`;
                folderSelect.appendChild(opt);
            });

            // Restore selection if still exists
            if (Array.from(folderSelect.options).some(o => o.value === currentSelected)) {
                folderSelect.value = currentSelected;
            }
        }

        function setStatusFilter(filterType) {
            if (isDirty) {
                if (!confirm("You have unsaved bounding boxes! Switch status filter anyway?")) return;
            }
            statusFilter = filterType;
            ['all', 'annotated', 'pending'].forEach(k => {
                const btn = document.getElementById(`filter-btn-${k}`);
                if (btn) {
                    if (k.toUpperCase() === statusFilter) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                }
            });
            filterImagesByFolder();
        }

        function onFolderChange() {
            if (isDirty) {
                if (!confirm("You have unsaved bounding boxes! Switch folder anyway?")) return;
            }
            filterImagesByFolder();
        }

        function filterImagesByFolder(targetFileToSelect = null) {
            const selectedFolder = document.getElementById('folder-select').value;
            let folderImages = [];
            if (selectedFolder === 'ALL') {
                folderImages = [...allImages];
            } else {
                const [m, c] = selectedFolder.split(' / ');
                folderImages = allImages.filter(img => img.mode === m && img.category === c);
            }

            // Calculate status counts for the selected folder
            const countAll = folderImages.length;
            const countAnnotated = folderImages.filter(img => img.is_annotated).length;
            const countPending = countAll - countAnnotated;

            document.getElementById('count-all').innerText = countAll;
            document.getElementById('count-annotated').innerText = countAnnotated;
            document.getElementById('count-pending').innerText = countPending;

            // Apply status filter
            if (statusFilter === 'ANNOTATED') {
                filteredImages = folderImages.filter(img => img.is_annotated);
            } else if (statusFilter === 'PENDING') {
                filteredImages = folderImages.filter(img => !img.is_annotated);
            } else {
                filteredImages = folderImages;
            }

            const fileSelect = document.getElementById('file-select');
            fileSelect.innerHTML = "";

            if (filteredImages.length === 0) {
                const opt = document.createElement('option');
                opt.value = -1;
                opt.innerText = `No ${statusFilter.toLowerCase()} documents in this folder`;
                fileSelect.appendChild(opt);
                currentBoxes = [];
                selectedBoxIndex = -1;
                redraw();
                updateBoxesList();
                document.getElementById('page-num').innerText = "0 / 0";
                document.getElementById('image-info').innerText = "No documents match current filter";
                return;
            }

            filteredImages.forEach((img, idx) => {
                const opt = document.createElement('option');
                opt.value = idx;
                const statusIcon = img.is_annotated ? `✅ [${img.box_count} boxes]` : `⏳ [Pending]`;
                opt.innerText = `${statusIcon} ${idx + 1}. ${img.file_name}`;
                fileSelect.appendChild(opt);
            });

            // If a specific file was requested (e.g. after save), select it; otherwise select index 0
            let targetIdx = 0;
            if (targetFileToSelect) {
                const foundIdx = filteredImages.findIndex(img => img.file_name === targetFileToSelect);
                if (foundIdx >= 0) targetIdx = foundIdx;
            }

            loadImage(targetIdx, false);
        }


        function onFileDropdownSelect() {
            if (isDirty) {
                if (!confirm("You have unsaved changes! Discard and switch file?")) {
                    document.getElementById('file-select').value = currentIndex;
                    return;
                }
            }
            const idx = parseInt(document.getElementById('file-select').value);
            loadImage(idx, false);
        }

        function confirmNavigate(delta) {
            const nextIdx = currentIndex + delta;
            if (nextIdx < 0 || nextIdx >= filteredImages.length) return;

            if (isDirty) {
                const choice = confirm("⚠️ WARNING: You have unsaved bounding boxes on this document!\\n\\nPress OK to SAVE & NEXT, or CANCEL to stay.");
                if (choice) {
                    triggerSaveExport(false);
                    loadImage(nextIdx, false);
                }
            } else {
                loadImage(nextIdx, false);
            }
        }

        function loadImage(index, showToastMsg = false) {
            if (index < 0 || index >= filteredImages.length) return;
            currentIndex = index;
            selectedBoxIndex = -1;
            isDirty = false;
            undoStack = [];
            redoStack = [];
            updateUndoRedoUI();
            
            const item = filteredImages[currentIndex];
            checkCounterpart(item.relative_path);
            
            document.getElementById('file-select').value = currentIndex;
            document.getElementById('page-num').innerText = `${currentIndex + 1} / ${filteredImages.length}`;
            document.getElementById('image-info').innerText = `File: ${item.file_name} [${item.mode} / ${item.category}]`;
            saveStatus.innerText = "Loading image...";

            // Auto-align base image folder to bounding_box_visualizations so subfolders mirror exactly
            const imgDirInput = document.getElementById('custom-img-dir');
            if (!imgDirInput.value || imgDirInput.value.includes('bounding_box_visualizations')) {
                imgDirInput.value = "data/interim/document_processing/bounding_box_visualizations";
            }

            const customCsv = document.getElementById('custom-csv-path').value;
            const customOcrCsv = document.getElementById('custom-ocr-csv-path').value;
            img = new Image();
            img.src = `/api/image_file?path=${encodeURIComponent(item.relative_path)}`;
            img.onload = () => {
                originalImgWidth = img.naturalWidth;
                originalImgHeight = img.naturalHeight;

                const targetHeight = Math.min(1600, originalImgHeight);
                baseDisplayScale = targetHeight / originalImgHeight;
                applyCanvasDimensions();
                
                fetch(`/api/get_boxes?file_name=${encodeURIComponent(item.file_name)}&csv_path=${encodeURIComponent(customCsv)}&ocr_csv_path=${encodeURIComponent(customOcrCsv)}`)
                    .then(res => res.json())
                    .then(boxes => {
                        currentBoxes = boxes || [];
                        undoStack = [];
                        redoStack = [];
                        updateUndoRedoButtons();
                        redraw();
                        updateBoxesList();
                        saveStatus.innerText = "Loaded successfully";
                        if (showToastMsg) showToast(`Loaded ${item.file_name}`);
                    })
                    .catch(err => {
                        console.error("Failed to load boxes for image:", err);
                        currentBoxes = [];
                        redraw();
                        updateBoxesList();
                        saveStatus.innerText = "Loaded image (0 boxes)";
                    });
            };
            img.onerror = () => {
                saveStatus.innerText = "Failed to load image file";
                showToast("Failed to load image file from disk", true);
            };
        }

        // --- PHYSICAL <-> SCAN COUNTERPART MANAGEMENT ---
        let currentBatchDirection = 'physical_to_scan';

        function checkCounterpart(relPath) {
            const btnCopy = document.getElementById('btn-counterpart-copy');
            const btnBatch = document.getElementById('btn-counterpart-batch');
            const btnJump = document.getElementById('btn-counterpart-jump');
            currentCounterpart = null;
            if (btnCopy) btnCopy.style.display = 'none';
            if (btnBatch) btnBatch.style.display = 'none';
            if (btnJump) btnJump.style.display = 'none';

            fetch(`/api/get_counterpart_info?path=${encodeURIComponent(relPath)}`)
                .then(res => res.json())
                .then(info => {
                    if (info.has_counterpart) {
                        currentCounterpart = info;
                        const targetModeLabel = info.direction === 'scan' ? 'Scan' : 'Physical';
                        btnCopy.innerText = `📋 Copy ➡️ ${targetModeLabel} (${info.counterpart_name})`;
                        btnCopy.title = `Transfer & scale all boxes and transcriptions to ${info.counterpart_name}`;
                        btnCopy.style.display = 'inline-flex';

                        btnBatch.innerText = `🔄 Copy ALL ➡️ ${targetModeLabel}`;
                        btnBatch.title = `Batch copy all files in folder to ${targetModeLabel} (Physical ⇄ Scan)`;
                        btnBatch.style.display = 'inline-flex';
                        
                        btnJump.innerText = `🔀 Switch to ${targetModeLabel}`;
                        btnJump.title = `Jump directly to ${info.counterpart_name}`;
                        btnJump.style.display = 'inline-flex';
                    }
                })
                .catch(err => {
                    console.error("Counterpart check failed:", err);
                });
        }

        function copyToCounterpart() {
            if (!currentCounterpart || !currentCounterpart.has_counterpart) {
                showToast("No counterpart file found for this document!", true);
                return;
            }
            if (currentBoxes.length === 0) {
                showToast("No bounding boxes on current image to copy!", true);
                return;
            }

            const targetName = currentCounterpart.counterpart_name;
            const msg = `Copy all ${currentBoxes.length} boxes and transcriptions to counterpart:\n${targetName}?\n\nCoordinates will be automatically scaled to fit target dimensions (${currentCounterpart.target_dimensions.width}x${currentCounterpart.target_dimensions.height}).`;
            if (!confirm(msg)) return;

            saveStatus.innerText = `Scaling and transferring boxes to ${targetName}...`;
            fetch('/api/copy_counterpart_boxes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    boxes: currentBoxes,
                    source_width: originalImgWidth,
                    source_height: originalImgHeight,
                    target_width: currentCounterpart.target_dimensions.width,
                    target_height: currentCounterpart.target_dimensions.height
                })
            })
            .then(res => res.json())
            .then(res => {
                if (res.status === 'ok' && res.boxes) {
                    const scaledBoxes = res.boxes;
                    // Jump to counterpart image and load scaled boxes
                    jumpToCounterpart((targetIdx) => {
                        pushHistory();
                        currentBoxes = scaledBoxes;
                        isDirty = true;
                        redraw();
                        updateBoxesList();
                        showToast(`Transferred ${scaledBoxes.length} boxes to ${targetName}! Click 'Save' when ready.`);
                        saveStatus.innerText = `Transferred ${scaledBoxes.length} boxes from counterpart.`;
                    });
                } else {
                    showToast("Failed to scale boxes for counterpart", true);
                }
            })
            .catch(err => {
                showToast("Error transferring boxes: " + err, true);
            });
        }

        function jumpToCounterpart(onLoadedCallback = null) {
            if (!currentCounterpart || !currentCounterpart.has_counterpart) {
                showToast("No counterpart file found!", true);
                return;
            }
            const targetName = currentCounterpart.counterpart_name;
            // First check if target is in filteredImages
            let idx = filteredImages.findIndex(img => img.file_name === targetName);
            if (idx >= 0) {
                loadImage(idx);
                if (onLoadedCallback) setTimeout(() => onLoadedCallback(idx), 350);
            } else {
                // If not in current filtered list, switch folder to counterpart's folder
                const targetFolder = (currentCounterpart.direction === 'scan' ? 'scan_capture' : 'physical_capture') + ' / ' + filteredImages[currentIndex].category;
                const folderSelect = document.getElementById('folder-select');
                if (Array.from(folderSelect.options).some(o => o.value === targetFolder)) {
                    folderSelect.value = targetFolder;
                    filterImagesByFolder(targetName);
                    if (onLoadedCallback) setTimeout(() => onLoadedCallback(0), 450);
                } else {
                    folderSelect.value = 'ALL';
                    filterImagesByFolder(targetName);
                    if (onLoadedCallback) setTimeout(() => onLoadedCallback(0), 450);
                }
            }
        }

        // --- BATCH COUNTERPART (PHYSICAL <-> SCAN) CONTROLS ---
        function openBatchCounterpartModal(forcedCategory = null, forcedDirection = null) {
            const modal = document.getElementById('batch-counterpart-modal');
            const catSelect = document.getElementById('batch-category-select');
            
            // Extract distinct categories from allImages
            const categories = Array.from(new Set(allImages.map(img => img.category))).filter(Boolean).sort();
            catSelect.innerHTML = '';
            categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.innerText = cat.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
                catSelect.appendChild(opt);
            });
            
            // Auto-select category
            let targetCat = forcedCategory;
            if (!targetCat && filteredImages[currentIndex] && filteredImages[currentIndex].category) {
                targetCat = filteredImages[currentIndex].category;
            }
            if (targetCat && categories.includes(targetCat)) {
                catSelect.value = targetCat;
            }
            
            // Auto-select direction based on current image mode or default
            let dir = forcedDirection;
            if (!dir && filteredImages[currentIndex]) {
                dir = filteredImages[currentIndex].mode === 'scan_capture' ? 'scan_to_physical' : 'physical_to_scan';
            }
            setBatchDirection(dir || 'physical_to_scan', false);
            
            modal.classList.add('active');
            loadBatchCounterpartSummary();
        }

        function closeBatchCounterpartModal() {
            const modal = document.getElementById('batch-counterpart-modal');
            modal.classList.remove('active');
            document.getElementById('batch-progress-container').style.display = 'none';
        }

        function setBatchDirection(direction, reloadSummary = true) {
            currentBatchDirection = direction;
            const cardP2S = document.getElementById('dir-card-p2s');
            const cardS2P = document.getElementById('dir-card-s2p');
            if (direction === 'physical_to_scan') {
                cardP2S.classList.add('active');
                cardS2P.classList.remove('active');
            } else {
                cardS2P.classList.add('active');
                cardP2S.classList.remove('active');
            }
            if (reloadSummary) {
                loadBatchCounterpartSummary();
            }
        }

        function loadBatchCounterpartSummary() {
            const cat = document.getElementById('batch-category-select').value;
            const summaryBox = document.getElementById('batch-summary-box');
            const btnTransfer = document.getElementById('btn-start-batch-transfer');
            const customCsv = document.getElementById('custom-csv-path').value.trim();
            const customOcrCsv = document.getElementById('custom-ocr-csv-path').value.trim();
            
            summaryBox.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:12px;">⏳ Analyzing files and counterpart matches...</div>';
            btnTransfer.disabled = true;
            
            const url = `/api/get_batch_counterpart_summary?category=${encodeURIComponent(cat)}&direction=${encodeURIComponent(currentBatchDirection)}&csv_path=${encodeURIComponent(customCsv)}&ocr_csv_path=${encodeURIComponent(customOcrCsv)}`;
            
            fetch(url)
                .then(res => res.json())
                .then(data => {
                    if (data.status !== 'ok') {
                        summaryBox.innerHTML = `<div style="color:#ef4444; padding:8px;">⚠️ ${data.message || 'Error loading summary'}</div>`;
                        return;
                    }
                    
                    const srcLabel = currentBatchDirection === 'physical_to_scan' ? 'Physical' : 'Scan';
                    const tgtLabel = currentBatchDirection === 'physical_to_scan' ? 'Scan' : 'Physical';
                    
                    let html = `
                        <div class="summary-metric">
                            <span style="color:#cbd5e1;">Source (${srcLabel}) Total Files:</span>
                            <span class="val">${data.total_source_files}</span>
                        </div>
                        <div class="summary-metric">
                            <span style="color:#cbd5e1;">Annotated Source Files:</span>
                            <span class="val" style="color:#10b981;">${data.annotated_source_files} files (${data.total_source_boxes} boxes)</span>
                        </div>
                        <div class="summary-metric">
                            <span style="color:#cbd5e1;">Target (${tgtLabel}) Counterparts Matched:</span>
                            <span class="val" style="color:${data.matched_counterparts > 0 ? '#38bdf8' : '#ef4444'};">${data.matched_counterparts} / ${data.total_source_files}</span>
                        </div>
                        <div class="summary-metric">
                            <span style="color:#cbd5e1;">Target Files Already Annotated:</span>
                            <span class="val" style="color:#fbbf24;">${data.already_annotated_targets} files</span>
                        </div>
                    `;
                    
                    if (data.annotated_source_files === 0) {
                        html += `
                            <div style="background:rgba(239, 68, 68, 0.15); border:1px solid #ef4444; border-radius:6px; padding:8px; margin-top:6px; color:#fca5a5; font-size:0.75rem;">
                                ⚠️ No annotations found in ${srcLabel} capture for "${cat}"! Please annotate ${srcLabel} files first or switch direction.
                            </div>
                        `;
                        btnTransfer.disabled = true;
                        btnTransfer.innerText = `No Annotations to Transfer`;
                    } else if (data.matched_counterparts === 0) {
                        html += `
                            <div style="background:rgba(239, 68, 68, 0.15); border:1px solid #ef4444; border-radius:6px; padding:8px; margin-top:6px; color:#fca5a5; font-size:0.75rem;">
                                ⚠️ No target counterpart files found in ${tgtLabel} folder for "${cat}"!
                            </div>
                        `;
                        btnTransfer.disabled = true;
                        btnTransfer.innerText = `No Counterparts Found`;
                    } else {
                        const transferableCount = data.transferable_files_count || data.matched_annotated_count || data.annotated_source_files;
                        btnTransfer.disabled = false;
                        btnTransfer.innerText = `🚀 Copy ${data.total_source_boxes} Boxes to ${tgtLabel} (${transferableCount} files)`;
                    }
                    
                    summaryBox.innerHTML = html;
                })
                .catch(err => {
                    summaryBox.innerHTML = `<div style="color:#ef4444; padding:8px;">⚠️ Server error: ${err.message}</div>`;
                    btnTransfer.disabled = true;
                });
        }

        function executeBatchCounterpartCopy() {
            const cat = document.getElementById('batch-category-select').value;
            const overwrite = document.getElementById('batch-opt-overwrite').checked;
            const exportImg = document.getElementById('batch-opt-render-img').checked;
            const customCsv = document.getElementById('custom-csv-path').value.trim();
            const customOcrCsv = document.getElementById('custom-ocr-csv-path').value.trim();
            const customImgDir = document.getElementById('custom-img-dir').value.trim();
            
            const srcLabel = currentBatchDirection === 'physical_to_scan' ? 'Physical' : 'Scan';
            const tgtLabel = currentBatchDirection === 'physical_to_scan' ? 'Scan' : 'Physical';
            
            if (!confirm(`Are you sure you want to batch copy all annotations from ${srcLabel} to ${tgtLabel} for "${cat}"?\n\nThis will scale coordinates and sync all bounding boxes and transcriptions.`)) {
                return;
            }
            
            const btnTransfer = document.getElementById('btn-start-batch-transfer');
            const progressContainer = document.getElementById('batch-progress-container');
            const progressText = document.getElementById('batch-progress-text');
            
            btnTransfer.disabled = true;
            progressContainer.style.display = 'block';
            progressText.innerText = `Transferring annotations from ${srcLabel} ➡️ ${tgtLabel}...`;
            saveStatus.innerText = "Running batch counterpart transfer...";
            
            fetch('/api/batch_copy_counterparts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: cat,
                    direction: currentBatchDirection,
                    overwrite: overwrite,
                    export_img: exportImg,
                    custom_csv_path: customCsv,
                    custom_ocr_csv_path: customOcrCsv,
                    custom_img_dir: customImgDir
                })
            })
            .then(res => res.json())
            .then(data => {
                progressContainer.style.display = 'none';
                btnTransfer.disabled = false;
                
                if (data.status === 'ok') {
                    showToast(`✅ Transferred ${data.total_boxes_copied} boxes across ${data.copied_files_count} files into ${tgtLabel}!`);
                    saveStatus.innerText = `Batch transfer complete: ${data.copied_files_count} files updated`;
                    
                    // Reload list and summary
                    refreshImagesList();
                    loadBatchCounterpartSummary();
                    
                    setTimeout(() => {
                        closeBatchCounterpartModal();
                    }, 1400);
                } else {
                    showToast(data.message || 'Batch transfer failed', true);
                    saveStatus.innerText = "Batch transfer error";
                }
            })
            .catch(err => {
                progressContainer.style.display = 'none';
                btnTransfer.disabled = false;
                showToast("Error during batch transfer: " + err, true);
                saveStatus.innerText = "Batch transfer failed";
            });
        }

        // --- SMARTER AI AUTO-DETECT (Printed + Handwritten Dual-Band) ---
        function triggerAiSmartDetect() {
            saveStatus.innerText = "AI dual-kernel detecting printed & handwritten strokes...";
            showToast("AI analyzing handwritten & printed text...");
            
            fetch('/api/ai_detect_boxes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    relative_path: filteredImages[currentIndex].relative_path,
                    active_label: activeLabelInput.value.trim() || 'auto_detected'
                })
            })
            .then(res => res.json())
            .then(res => {
                if (res.status === 'ok' && res.boxes.length > 0) {
                    currentBoxes = currentBoxes.concat(res.boxes);
                    isDirty = true;
                    redraw();
                    updateBoxesList();
                    showToast(`AI detected ${res.boxes.length} text lines (Printed + HW)!`);
                    saveStatus.innerText = `AI added ${res.boxes.length} boxes`;
                } else {
                    showToast("No clear text contours detected", true);
                }
            });
        }

        // --- DISTINCT CLASS COLORED BOUNDING BOX DRAWING ---
        function redraw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // If eye mode is toggled off, only draw the raw image without boxes
            if (!showBoundingBoxes) return;

            const scale = getEffectiveScale();

            currentBoxes.forEach((b, idx) => {

                const sx = b.bbox_x * scale;
                const sy = b.bbox_y * scale;
                const sw = b.bbox_width * scale;
                const sh = b.bbox_height * scale;
                const isSelected = (idx === selectedBoxIndex || selectedBoxIndices.includes(idx));
                const boxColor = getColorForLabel(b.label_name);

                // Check if current document is a scan capture (white paper) or photo (darker background)
                const isScanDoc = (filteredImages[currentIndex] && (filteredImages[currentIndex].mode === 'scan' || (filteredImages[currentIndex].relative_path || '').includes('scan')));

                // If Bounding Boxes are hidden, only show subtle outline if this box is selected
                if (!showBoundingBoxes && !showBoxes) {
                    if (isSelected) {
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
                        ctx.lineWidth = 2;
                        ctx.setLineDash([4, 4]);
                        ctx.strokeRect(sx, sy, sw, sh);
                        ctx.setLineDash([]);
                    }
                    return;
                }

                // 1. Semi-transparent tinted background inside box to distinguish area
                ctx.fillStyle = isSelected ? (isScanDoc ? 'rgba(0, 0, 0, 0.22)' : 'rgba(255, 255, 255, 0.25)') : hexToRgba(boxColor, 0.12);
                ctx.fillRect(sx, sy, sw, sh);

                // 2. High-Contrast Selection Border:
                // If selected on bright white scanned documents, use bold solid BLACK (#000000) outer border with crisp inner line
                // If on camera photo documents, use bold glowing WHITE (#ffffff) with black drop shadow
                if (isSelected) {
                    ctx.strokeStyle = isScanDoc ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)';
                    ctx.lineWidth = 5;
                    ctx.strokeRect(sx, sy, sw, sh);

                    ctx.strokeStyle = isScanDoc ? '#000000' : '#ffffff';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(sx, sy, sw, sh);
                } else {
                    ctx.strokeStyle = boxColor;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(sx, sy, sw, sh);
                }

                // 3. Readable Upper Label Pill (pinned precisely onto the top edge, hidden in 'Boxes Only' mode)
                if (showLabels) {
                    const labelText = b.label_name || 'unlabeled';
                    ctx.font = 'bold 12px Segoe UI, sans-serif';
                    const tw = ctx.measureText(labelText).width;
                    const pillW = tw + 10;
                    const pillH = 19;
                    const pillY = Math.max(0, sy - pillH + 1);

                    // Solid badge background
                    ctx.fillStyle = isSelected ? (isScanDoc ? '#000000' : '#ffffff') : boxColor;
                    ctx.fillRect(sx, pillY, pillW, pillH);

                    // High contrast text
                    ctx.fillStyle = isSelected ? (isScanDoc ? '#ffffff' : '#000000') : '#000000';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(labelText, sx + 5, pillY + (pillH / 2));
                    ctx.textBaseline = 'alphabetic';
                }
                if (isSelected) {
                    // Outer high-contrast shadow/halo
                    ctx.strokeStyle = isScanDoc ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)';
                    ctx.lineWidth = 5;
                    ctx.strokeRect(sx, sy, sw, sh);

                    // Core selected border (Black on white scan documents, White on photo captures)
                    ctx.strokeStyle = isScanDoc ? '#000000' : '#ffffff';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(sx, sy, sw, sh);
                } else {
                    ctx.strokeStyle = boxColor;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(sx, sy, sw, sh);
                }

                // 3. Readable Upper Label Pill (pinned precisely onto the top edge, hidden in 'Boxes Only' mode)
                if (showLabels) {
                    const labelText = b.label_name || 'unlabeled';
                    ctx.font = 'bold 12px Segoe UI, sans-serif';
                    const tw = ctx.measureText(labelText).width;
                    const pillW = tw + 10;
                    const pillH = 19;
                    const pillY = Math.max(0, sy - pillH + 1);

                    // Solid badge background (black background on scans when selected, white on photo)
                    if (isSelected) {
                        ctx.fillStyle = isScanDoc ? '#000000' : '#ffffff';
                    } else {
                        ctx.fillStyle = boxColor;
                    }
                    ctx.fillRect(sx, pillY, pillW, pillH);

                    // Contrasting high-legibility text
                    ctx.fillStyle = isSelected ? (isScanDoc ? '#ffffff' : '#000000') : '#000000';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(labelText, sx + 5, pillY + (pillH / 2));
                    ctx.textBaseline = 'alphabetic'; // reset
                }

                // 4. Selected corner handles (rendered in bold black & white for maximum visibility)
                if (isSelected && (selectedBoxIndex === idx || selectedBoxIndices.length === 1)) {
                    ctx.fillStyle = isScanDoc ? '#000000' : '#ffffff';
                    ctx.strokeStyle = isScanDoc ? '#ffffff' : '#000000';
                    ctx.lineWidth = 1.8;
                    const hs = 9;
                    const corners = [
                        [sx - hs/2, sy - hs/2],
                        [sx + sw - hs/2, sy - hs/2],
                        [sx - hs/2, sy + sh - hs/2],
                        [sx + sw - hs/2, sy + sh - hs/2]
                    ];
                    corners.forEach(([cx, cy]) => {
                        ctx.fillRect(cx, cy, hs, hs);
                        ctx.strokeRect(cx, cy, hs, hs);
                    });
                }
            });

            // 5. Render Drag Marquee Rectangle (Ctrl + Right-Click drag to multi-select)
            if (isMarqueeActive) {
                const mx = Math.min(marqueeStart.x, marqueeCurrent.x);
                const my = Math.min(marqueeStart.y, marqueeCurrent.y);
                const mw = Math.abs(marqueeCurrent.x - marqueeStart.x);
                const mh = Math.abs(marqueeCurrent.y - marqueeStart.y);

                ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
                ctx.fillRect(mx, my, mw, mh);

                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(mx, my, mw, mh);
                ctx.setLineDash([]);
            }
        }

        function hexToRgba(hex, alpha) {
            let c = hex.replace('#', '');
            if (c.length === 3) c = c.split('').map(x => x + x).join('');
            const r = parseInt(c.substring(0, 2), 16);
            const g = parseInt(c.substring(2, 4), 16);
            const b = parseInt(c.substring(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }

        function getHandleAt(mx, my, b) {
            const scale = getEffectiveScale();
            const sx = b.bbox_x * scale;
            const sy = b.bbox_y * scale;
            const sw = b.bbox_width * scale;
            const sh = b.bbox_height * scale;
            const d = 10;

            if (Math.hypot(mx - sx, my - sy) < d) return 'tl';
            if (Math.hypot(mx - (sx + sw), my - sy) < d) return 'tr';
            if (Math.hypot(mx - sx, my - (sy + sh)) < d) return 'bl';
            if (Math.hypot(mx - (sx + sw), my - (sy + sh)) < d) return 'br';
            return null;
        }

        function isInsideBox(mx, my, b) {
            const scale = getEffectiveScale();
            const sx = b.bbox_x * scale;
            const sy = b.bbox_y * scale;
            const sw = b.bbox_width * scale;
            const sh = b.bbox_height * scale;
            return mx >= sx && mx <= sx + sw && my >= sy && my <= sy + sh;
        }

        // Prevent default browser context menu on canvas so right-click drag works smoothly
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        canvas.addEventListener('mousedown', (e) => {
            // SPACEBAR PANNING DRAG
            if (isSpacePressed) {
                isPanning = true;
                panStartX = e.clientX;
                panStartY = e.clientY;
                scrollStartLeft = canvasWrapper.scrollLeft;
                scrollStartTop = canvasWrapper.scrollTop;
                canvas.style.cursor = 'grabbing';
                return;
            }

            const rect = canvas.getBoundingClientRect();
            startX = (e.clientX - rect.left);
            startY = (e.clientY - rect.top);
            origBoxesSnapshot = JSON.parse(JSON.stringify(currentBoxes));

            // 1. CTRL + RIGHT CLICK (OR CTRL + LEFT CLICK DRAG): MARQUEE LASSO MULTI-SELECT
            if ((e.button === 2 && (e.ctrlKey || e.shiftKey)) || (e.button === 0 && e.shiftKey)) {
                isMarqueeActive = true;
                marqueeStart = { x: startX, y: startY };
                marqueeCurrent = { x: startX, y: startY };
                selectedBoxIndex = -1;
                selectedBoxIndices = [];
                redraw();
                updateBoxesList();
                e.preventDefault();
                return;
            }

            // Normal Right Click alone: context / ignore
            if (e.button === 2) {
                e.preventDefault();
                return;
            }

            // If in Drag ALL Boxes mode (A): click and drag ANYWHERE on canvas drags all boxes together
            if (appMode === 'drag_all') {
                if (currentBoxes.length > 0) {
                    interactionMode = 'drag_all';
                    origBoxState = currentBoxes.map((b, i) => ({ idx: i, bbox_x: b.bbox_x, bbox_y: b.bbox_y, bbox_width: b.bbox_width, bbox_height: b.bbox_height }));
                    isInteracting = true;
                    selectedBoxIndices = currentBoxes.map((_, i) => i);
                    selectedBoxIndex = 0;
                    redraw();
                    updateBoxesList();
                } else {
                    showToast('No boxes on current document to drag', true);
                }
                return;
            }

            // 2. CHECK RESIZE HANDLE ON PRIMARY SELECTED BOX
            if (selectedBoxIndex >= 0 && selectedBoxIndex < currentBoxes.length) {
                const handle = getHandleAt(startX, startY, currentBoxes[selectedBoxIndex]);
                if (handle) {
                    interactionMode = 'resize';
                    resizeHandle = handle;
                    origBoxState = { ...currentBoxes[selectedBoxIndex] };
                    isInteracting = true;
                    return;
                }
            }

            // 3. CHECK CLICK INSIDE AN EXISTING BOX
            let clickedIdx = -1;
            for (let i = currentBoxes.length - 1; i >= 0; i--) {
                if (isInsideBox(startX, startY, currentBoxes[i])) {
                    clickedIdx = i;
                    break;
                }
            }

            if (clickedIdx >= 0) {
                // If multiple boxes are selected and user clicks on one of them: GROUP MOVE ALL SELECTED BOXES!
                if (selectedBoxIndices.length > 1 && selectedBoxIndices.includes(clickedIdx)) {
                    interactionMode = 'group_move';
                    origBoxState = selectedBoxIndices.map(i => ({ idx: i, ...currentBoxes[i] }));
                    isInteracting = true;
                    redraw();
                    updateBoxesList();
                    return;
                }

                // If Ctrl + Left click on a box, toggle it in the multi-selection
                if (e.ctrlKey) {
                    if (selectedBoxIndices.includes(clickedIdx)) {
                        selectedBoxIndices = selectedBoxIndices.filter(i => i !== clickedIdx);
                        if (selectedBoxIndex === clickedIdx) {
                            selectedBoxIndex = selectedBoxIndices.length > 0 ? selectedBoxIndices[0] : -1;
                        }
                    } else {
                        selectedBoxIndices.push(clickedIdx);
                        selectedBoxIndex = clickedIdx;
                    }
                    redraw();
                    updateBoxesList();
                    return;
                }

                // Single box selection & move
                selectedBoxIndices = [clickedIdx];
                selectedBoxIndex = clickedIdx;
                interactionMode = 'move';
                origBoxState = { ...currentBoxes[clickedIdx] };
                isInteracting = true;
                selectBox(clickedIdx);
                return;
            }

            // Clicked empty space
            if (appMode === 'drag' || appMode === 'drag_all') {
                // In Drag or Drag ALL mode: clicking empty space simply deselects without creating new boxes
                selectedBoxIndex = -1;
                selectedBoxIndices = [];
                interactionMode = 'none';
                isInteracting = false;
                redraw();
                updateBoxesList();
                return;
            }

            // In Draw mode: clear selection and begin drawing
            selectedBoxIndex = -1;
            selectedBoxIndices = [];
            interactionMode = 'draw';
            isInteracting = true;
            redraw();
            updateBoxesList();
        });

        canvas.addEventListener('mousemove', (e) => {
            if (isPanning) {
                const dx = e.clientX - panStartX;
                const dy = e.clientY - panStartY;
                canvasWrapper.scrollLeft = scrollStartLeft - dx;
                canvasWrapper.scrollTop = scrollStartTop - dy;
                return;
            }

            const rect = canvas.getBoundingClientRect();
            const currX = (e.clientX - rect.left);
            const currY = (e.clientY - rect.top);

            // Handle Marquee Drag Multi-Select
            if (isMarqueeActive) {
                marqueeCurrent = { x: currX, y: currY };
                
                // Highlight boxes that intersect with marquee in real time
                const mx1 = Math.min(marqueeStart.x, marqueeCurrent.x);
                const my1 = Math.min(marqueeStart.y, marqueeCurrent.y);
                const mx2 = Math.max(marqueeStart.x, marqueeCurrent.x);
                const my2 = Math.max(marqueeStart.y, marqueeCurrent.y);

                const scale = getEffectiveScale();
                selectedBoxIndices = [];
                currentBoxes.forEach((b, i) => {
                    const bx1 = b.bbox_x * scale;
                    const by1 = b.bbox_y * scale;
                    const bx2 = (b.bbox_x + b.bbox_width) * scale;
                    const by2 = (b.bbox_y + b.bbox_height) * scale;

                    // AABB rectangle overlap test
                    if (bx1 < mx2 && bx2 > mx1 && by1 < my2 && by2 > my1) {
                        selectedBoxIndices.push(i);
                    }
                });

                selectedBoxIndex = selectedBoxIndices.length > 0 ? selectedBoxIndices[0] : -1;
                redraw();
                return;
            }

            if (!isInteracting) {
                let cursor = isSpacePressed ? 'grab' : (appMode === 'drag_all' ? 'move' : (appMode === 'drag' ? 'default' : 'crosshair'));
                if (!isSpacePressed && appMode !== 'drag_all') {
                    if (selectedBoxIndex >= 0 && selectedBoxIndex < currentBoxes.length) {
                        const h = getHandleAt(currX, currY, currentBoxes[selectedBoxIndex]);
                        if (h === 'tl' || h === 'br') cursor = 'nwse-resize';
                        else if (h === 'tr' || h === 'bl') cursor = 'nesw-resize';
                        else if (isInsideBox(currX, currY, currentBoxes[selectedBoxIndex])) cursor = 'move';
                    }
                    if (cursor === 'default' || cursor === 'crosshair') {
                        for (let i = currentBoxes.length - 1; i >= 0; i--) {
                            if (isInsideBox(currX, currY, currentBoxes[i])) {
                                cursor = 'move';
                                break;
                            }
                        }
                    }
                }
                canvas.style.cursor = cursor;
                return;
            }

            const scale = getEffectiveScale();
            const dx = (currX - startX) / scale;
            const dy = (currY - startY) / scale;

            if ((interactionMode === 'group_move' || interactionMode === 'drag_all') && Array.isArray(origBoxState)) {
                // Move ALL selected boxes together
                origBoxState.forEach(item => {
                    const b = currentBoxes[item.idx];
                    if (b) {
                        b.bbox_x = Math.max(0, Math.round(item.bbox_x + dx));
                        b.bbox_y = Math.max(0, Math.round(item.bbox_y + dy));
                    }
                });
                isDirty = true;
                redraw();
            } else if (interactionMode === 'move' && selectedBoxIndex >= 0) {
                const b = currentBoxes[selectedBoxIndex];
                b.bbox_x = Math.max(0, Math.round(origBoxState.bbox_x + dx));
                b.bbox_y = Math.max(0, Math.round(origBoxState.bbox_y + dy));
                isDirty = true;
                redraw();
            } else if (interactionMode === 'resize' && selectedBoxIndex >= 0) {
                const b = currentBoxes[selectedBoxIndex];
                if (resizeHandle === 'br') {
                    b.bbox_width = Math.max(10, Math.round(origBoxState.bbox_width + dx));
                    b.bbox_height = Math.max(10, Math.round(origBoxState.bbox_height + dy));
                } else if (resizeHandle === 'tl') {
                    b.bbox_x = Math.max(0, Math.round(origBoxState.bbox_x + dx));
                    b.bbox_y = Math.max(0, Math.round(origBoxState.bbox_y + dy));
                    b.bbox_width = Math.max(10, Math.round(origBoxState.bbox_width - dx));
                    b.bbox_height = Math.max(10, Math.round(origBoxState.bbox_height - dy));
                } else if (resizeHandle === 'tr') {
                    b.bbox_y = Math.max(0, Math.round(origBoxState.bbox_y + dy));
                    b.bbox_width = Math.max(10, Math.round(origBoxState.bbox_width + dx));
                    b.bbox_height = Math.max(10, Math.round(origBoxState.bbox_height - dy));
                } else if (resizeHandle === 'bl') {
                    b.bbox_x = Math.max(0, Math.round(origBoxState.bbox_x + dx));
                    b.bbox_width = Math.max(10, Math.round(origBoxState.bbox_width - dx));
                    b.bbox_height = Math.max(10, Math.round(origBoxState.bbox_height + dy));
                }
                isDirty = true;
                redraw();
            } else if (interactionMode === 'draw') {
                redraw();
                ctx.strokeStyle = THEME_CYAN;
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(startX, startY, currX - startX, currY - startY);
                ctx.setLineDash([]);
            }
        });

        canvas.addEventListener('mouseup', (e) => {
            if (isPanning) {
                isPanning = false;
                canvas.style.cursor = isSpacePressed ? 'grab' : (appMode === 'drag_all' ? 'move' : (appMode === 'drag' ? 'default' : 'crosshair'));
                return;
            }

            if (isMarqueeActive) {
                isMarqueeActive = false;
                redraw();
                updateBoxesList();
                if (selectedBoxIndices.length > 0) {
                    showToast(`Selected ${selectedBoxIndices.length} boxes (drag any to move together)`);
                }
                return;
            }

            if (!isInteracting) return;
            const rect = canvas.getBoundingClientRect();
            const endX = (e.clientX - rect.left);
            const endY = (e.clientY - rect.top);

            if (interactionMode === 'draw') {
                const bx = Math.min(startX, endX);
                const by = Math.min(startY, endY);
                const bw = Math.abs(endX - startX);
                const bh = Math.abs(endY - startY);

                if (bw > 10 && bh > 8) {
                    pushHistory(); // Record state before adding new box
                    const scale = getEffectiveScale();
                    const label = activeLabelInput.value.trim() || "unlabeled";
                    const lLower = label.toLowerCase();
                    let defType = 'FORM_SECTION';
                    if (lLower.startsWith('family_member')) {
                        defType = 'TABLE_CELL';
                    } else if (lLower.includes('sign') && !lLower.includes('name') && !lLower.includes('title')) {
                        defType = 'SIGNATURE';
                    } else if (lLower.includes('seal') || lLower.includes('stamp')) {
                        defType = 'STAMP_OR_SEAL';
                    } else if (lLower.includes('check')) {
                        defType = 'CHECKMARK_OR_CHECKBOX';
                    }
                    const newBox = {
                        label_name: label,
                        box_type: defType,
                        transcription_text: defType === 'CHECKMARK_OR_CHECKBOX' ? '[✓]' : (defType === 'SIGNATURE' ? '[SIGNATURE]' : (defType === 'STAMP_OR_SEAL' ? '[SEAL]' : '')),
                        bbox_x: Math.round(bx / scale),
                        bbox_y: Math.round(by / scale),
                        bbox_width: Math.round(bw / scale),
                        bbox_height: Math.round(bh / scale),
                        image_name: filteredImages[currentIndex].file_name,
                        image_width: originalImgWidth,
                        image_height: originalImgHeight
                    };
                    currentBoxes.push(newBox);
                    selectedBoxIndex = currentBoxes.length - 1;
                    selectedBoxIndices = [selectedBoxIndex];
                    isDirty = true;
                }
            } else if (interactionMode === 'move' || interactionMode === 'resize' || interactionMode === 'group_move' || interactionMode === 'drag_all') {
                // If a box or group was actually moved/resized, push undo state
                if (origBoxState && isDirty) {
                    const previousClone = JSON.parse(JSON.stringify(currentBoxes));
                    if ((interactionMode === 'group_move' || interactionMode === 'drag_all') && Array.isArray(origBoxState)) {
                        origBoxState.forEach(item => {
                            if (previousClone[item.idx]) {
                                previousClone[item.idx].bbox_x = item.bbox_x;
                                previousClone[item.idx].bbox_y = item.bbox_y;
                            }
                        });
                    } else if (origBoxState && selectedBoxIndex >= 0 && previousClone[selectedBoxIndex]) {
                        previousClone[selectedBoxIndex].bbox_x = origBoxState.bbox_x;
                        previousClone[selectedBoxIndex].bbox_y = origBoxState.bbox_y;
                        previousClone[selectedBoxIndex].bbox_width = origBoxState.bbox_width;
                        previousClone[selectedBoxIndex].bbox_height = origBoxState.bbox_height;
                    }
                    undoStack.push(JSON.stringify(previousClone));
                    if (undoStack.length > 50) undoStack.shift();
                    redoStack = [];
                    if (typeof updateUndoRedoButtons === 'function') updateUndoRedoButtons();
                    if (typeof updateUndoRedoUI === 'function') updateUndoRedoUI();
                }
            }

            isInteracting = false;
            interactionMode = 'none';
            redraw();
            updateBoxesList();
        });

        // Search Filter for Boxes List
        function filterBoxesList() {
            const query = searchBoxesInput.value.toLowerCase().trim();
            const items = document.querySelectorAll('#boxes-list .box-item');
            items.forEach(it => {
                const text = it.getAttribute('data-label').toLowerCase();
                if (text.includes(query)) it.style.display = 'flex';
                else it.style.display = 'none';
            });
        }

        function updateBoxesList() {
            document.getElementById('box-count').innerText = currentBoxes.length;
            const list = document.getElementById('boxes-list');
            list.innerHTML = "";
            currentBoxes.forEach((b, idx) => {
                const isSelected = (idx === selectedBoxIndex);
                const bColor = getColorForLabel(b.label_name);
                const item = document.createElement('div');
                item.className = "box-item" + (isSelected ? " selected" : "");
                item.id = `box-card-${idx}`;
                item.style.borderLeftColor = bColor;
                item.setAttribute('data-label', b.label_name);
                item.onclick = () => selectBox(idx);

                let selectHtml = `<select onchange="changeBoxLabel(${idx}, this.value)" onclick="event.stopPropagation()" style="flex:1; max-width:130px;">`;
                allPresets.forEach(p => {
                    selectHtml += `<option value="${p}" ${p === b.label_name ? 'selected' : ''}>${p}</option>`;
                });
                selectHtml += `</select>`;

                const bLabel = (b.label_name || '').toLowerCase();
                const bTrans = (b.transcription_text || '').toLowerCase();
                const bType = b.box_type || (
                    bLabel.startsWith('family_member') ? 'TABLE_CELL' :
                    (bTrans.includes('[signature]') || (bLabel.includes('sign') && !bLabel.includes('name') && !bLabel.includes('title')) ? 'SIGNATURE' :
                    (bTrans.includes('[seal]') || bTrans.includes('[stamp]') || bLabel.includes('seal') || bLabel.includes('stamp') ? 'STAMP_OR_SEAL' :
                    (bTrans.includes('[✓]') || bTrans === '✓' || bLabel.includes('check') ? 'CHECKMARK_OR_CHECKBOX' : 'FORM_SECTION')))
                );
                
                // Use dynamic box types list with fallback
                const typesToRender = (allBoxTypes && allBoxTypes.length > 0) ? allBoxTypes : [
                    {"id": "CHECKMARK_OR_CHECKBOX", "label": "☑️ Checkmark / Checkbox"},
                    {"id": "HANDWRITTEN_ENTRY", "label": "✍️ Handwritten Entry"},
                    {"id": "FORM_SECTION", "label": "📋 Printed Form Section"},
                    {"id": "SIGNATURE", "label": "✒️ Signature"},
                    {"id": "STAMP_OR_SEAL", "label": "🔘 Official Stamp / Seal"},
                    {"id": "TABLE_CELL", "label": "📊 Table Cell"}
                ];

                let typeSelectHtml = `<select onchange="changeBoxType(${idx}, this.value)" onclick="event.stopPropagation()" style="width:130px; font-size:0.68rem; color:#38bdf8;">`;
                let matchedType = false;
                typesToRender.forEach(t => {
                    const isSel = (t.id === bType);
                    if (isSel) matchedType = true;
                    typeSelectHtml += `<option value="${t.id}" ${isSel ? 'selected' : ''}>${t.label}</option>`;
                });
                if (!matchedType && bType) {
                    typeSelectHtml += `<option value="${bType}" selected>🏷️ ${bType}</option>`;
                }
                typeSelectHtml += `</select>`;

                const transVal = (b.transcription_text !== undefined) ? b.transcription_text : (bType === 'CHECKMARK_OR_CHECKBOX' ? '[✓]' : '');

                item.innerHTML = `
                    <div style="display:flex; flex-direction:column; gap:3px; flex:1;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span><strong>#${idx+1}</strong> (${b.bbox_width}x${b.bbox_height})</span>
                            <span class="del-btn" title="Delete Box (Del)" onclick="deleteBox(${idx}, event)">✕</span>
                        </div>
                        <div style="display:flex; gap:4px; align-items:center;">
                            ${selectHtml}
                            ${typeSelectHtml}
                        </div>
                        <div style="display:flex; gap:3px; align-items:center; margin-top:2px;">
                            <input type="text" placeholder="📝 Transcribe OCR text..." value="${transVal.replace(/"/g, '&quot;')}" 
                                oninput="changeBoxTranscription(${idx}, this.value)" 
                                onclick="event.stopPropagation()" 
                                style="flex:1; font-size:0.72rem; padding:2px 5px; background:#0b1120; border:1px solid #3b82f6; border-radius:4px; color:#38bdf8;">
                            <button type="button" title="Set Checked [✓]" onclick="event.stopPropagation(); setQuickTrans(${idx}, '[✓]');" style="padding:1px 5px; font-size:0.65rem; background:#1e293b; color:#10b981; border:1px solid #10b981;">[✓]</button>
                            <button type="button" title="Set Unchecked [ ]" onclick="event.stopPropagation(); setQuickTrans(${idx}, '[ ]');" style="padding:1px 5px; font-size:0.65rem; background:#1e293b; color:#94a3b8; border:1px solid #64748b;">[ ]</button>
                            <button type="button" title="Tag Signature (sets [SIGNATURE] and SIGNATURE box type)" onclick="event.stopPropagation(); setQuickSignature(${idx});" style="padding:1px 4px; font-size:0.63rem; background:#1e293b; color:#38bdf8; border:1px solid #0284c7;">✒️ Sig</button>
                            <button type="button" title="Tag Official Stamp/Seal (sets [SEAL] and STAMP_OR_SEAL box type)" onclick="event.stopPropagation(); setQuickSeal(${idx});" style="padding:1px 4px; font-size:0.63rem; background:#1e293b; color:#eab308; border:1px solid #ca8a04;">🔘 Seal</button>
                        </div>
                        <div style="display:flex; gap:3px; align-items:center; margin-top:2px;">
                            <input type="text" placeholder="⚠️ Quality Notes (e.g. spelling mismatch, unreadable, entry error)..." value="${(b.transcription_quality_notes || '').replace(/"/g, '&quot;')}"
                                oninput="changeBoxNote(${idx}, this.value)"
                                onclick="event.stopPropagation()"
                                style="flex:1; font-size:0.68rem; padding:2px 5px; background:#0f172a; border:1px dashed #64748b; border-radius:4px; color:#f59e0b;">
                            <button type="button" title="Tag Name Spelling Mismatch" onclick="event.stopPropagation(); toggleQuickNote(${idx}, 'name_spelling_mismatch');" style="padding:1px 4px; font-size:0.63rem; background:#1e293b; color:#f59e0b; border:1px solid #f59e0b;" class="btn-hover-scale">🔤 Mismatch</button>
                            <button type="button" title="Tag Beneficiary Entry Error" onclick="event.stopPropagation(); toggleQuickNote(${idx}, 'possible_beneficiary_entry_error');" style="padding:1px 4px; font-size:0.63rem; background:#1e293b; color:#ef4444; border:1px solid #ef4444;" class="btn-hover-scale">⚠️ Error</button>
                            <button type="button" title="Tag Unreadable Text (sets [UNREADABLE])" onclick="event.stopPropagation(); setUnreadableText(${idx});" style="padding:1px 4px; font-size:0.63rem; background:#1e293b; color:#a855f7; border:1px solid #a855f7;" class="btn-hover-scale">❓ Unreadable</button>
                        </div>

                    </div>
                `;
                list.appendChild(item);
            });
            filterBoxesList();
        }

        function changeBoxTranscription(idx, val) {
            if (idx >= 0 && idx < currentBoxes.length) {
                currentBoxes[idx].transcription_text = val;
                isDirty = true;
            }
        }

        function changeBoxNote(idx, val) {
            if (idx >= 0 && idx < currentBoxes.length) {
                currentBoxes[idx].transcription_quality_notes = val;
                isDirty = true;
            }
        }

        function toggleQuickNote(idx, tag) {
            if (idx >= 0 && idx < currentBoxes.length) {
                let curr = (currentBoxes[idx].transcription_quality_notes || '').trim();
                if (curr === 'Manual human ground truth') curr = '';
                if (curr.includes(tag)) {
                    curr = curr.replace(tag, '').replace(/,\\s*,/g, ',').replace(/^,\\s*|,\\s*$/g, '').trim();
                } else {
                    curr = curr ? `${curr}, ${tag}` : tag;
                }
                currentBoxes[idx].transcription_quality_notes = curr || 'Manual human ground truth';
                isDirty = true;
                updateBoxesList();
                showToast(`Note updated for #${idx+1}`);
            }
        }

        function setUnreadableText(idx) {
            if (idx >= 0 && idx < currentBoxes.length) {
                pushHistory();
                currentBoxes[idx].transcription_text = '[UNREADABLE]';
                let curr = (currentBoxes[idx].transcription_quality_notes || '').trim();
                if (curr === 'Manual human ground truth') curr = '';
                if (!curr.includes('unreadable_text')) {
                    curr = curr ? `${curr}, unreadable_text` : 'unreadable_text';
                }
                currentBoxes[idx].transcription_quality_notes = curr;
                isDirty = true;
                updateBoxesList();
                showToast(`Box #${idx+1} marked as [UNREADABLE]`);
            }
        }

        function setQuickTrans(idx, val) {
            if (idx >= 0 && idx < currentBoxes.length) {
                pushHistory();
                currentBoxes[idx].transcription_text = val;
                if (val === '[✓]' || val === '[ ]') {
                    currentBoxes[idx].box_type = 'CHECKMARK_OR_CHECKBOX';
                }
                isDirty = true;
                updateBoxesList();
                showToast(`Set #${idx+1} transcription to "${val}"`);
            }
        }

        function setQuickSignature(idx) {
            if (idx >= 0 && idx < currentBoxes.length) {
                currentBoxes[idx].transcription_text = '[SIGNATURE]';
                currentBoxes[idx].box_type = 'SIGNATURE';
                if (!currentBoxes[idx].label_name || currentBoxes[idx].label_name === 'auto_detected') {
                    currentBoxes[idx].label_name = 'doctor_signature';
                }
                isDirty = true;
                updateBoxesList();
                showToast(`Box #${idx+1} tagged as [SIGNATURE]`);
            }
        }

        function setQuickSeal(idx) {
            if (idx >= 0 && idx < currentBoxes.length) {
                currentBoxes[idx].transcription_text = '[SEAL]';
                currentBoxes[idx].box_type = 'STAMP_OR_SEAL';
                if (!currentBoxes[idx].label_name || currentBoxes[idx].label_name === 'auto_detected') {
                    currentBoxes[idx].label_name = 'hospital_stamp';
                }
                isDirty = true;
                updateBoxesList();
                showToast(`Box #${idx+1} tagged as [SEAL]`);
            }
        }


        function anyHandwrittenWords(name) {

            const str = (name || '').toLowerCase();
            return ['name', 'rel', 'age', 'income', 'diagnosis', 'occupation', 'msws', 'clinic', 'marital'].some(w => str.includes(w));
        }

        function changeBoxType(idx, newType) {
            if (idx >= 0 && idx < currentBoxes.length) {
                pushHistory();
                currentBoxes[idx].box_type = newType;
                if (newType === 'CHECKMARK_OR_CHECKBOX' && !currentBoxes[idx].transcription_text) {
                    currentBoxes[idx].transcription_text = '[✓]';
                }
                isDirty = true;
                updateBoxesList();
                showToast(`Set box #${idx+1} type to ${newType}`);
            }
        }

        function selectBox(idx) {
            selectedBoxIndex = idx;
            selectedBoxIndices = (idx >= 0) ? [idx] : [];
            redraw();
            updateBoxesList();
            if (idx >= 0) {
                setTimeout(() => {
                    const el = document.getElementById(`box-card-${idx}`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }, 50);
            }
        }

        function changeBoxLabel(idx, newLabel) {
            if (idx >= 0 && idx < currentBoxes.length) {
                pushHistory();
                currentBoxes[idx].label_name = newLabel;
                isDirty = true;
                redraw();
                updateBoxesList();
                showToast(`Updated box #${idx+1} to ${newLabel}`);
            }
        }

        function deleteSelectedBox() {
            // If multiple boxes are selected via marquee or Ctrl+Click, delete all of them
            if (selectedBoxIndices.length > 1) {
                pushHistory(); // Record state before batch delete
                const count = selectedBoxIndices.length;
                // Sort descending to splice safely from back to front
                const sortedIndices = [...selectedBoxIndices].sort((a, b) => b - a);
                sortedIndices.forEach(i => {
                    if (i >= 0 && i < currentBoxes.length) {
                        currentBoxes.splice(i, 1);
                    }
                });
                selectedBoxIndex = -1;
                selectedBoxIndices = [];
                isDirty = true;
                redraw();
                updateBoxesList();
                showToast(`Deleted ${count} selected boxes`);
                return;
            }

            if (selectedBoxIndex >= 0 && selectedBoxIndex < currentBoxes.length) {
                deleteBox(selectedBoxIndex);
            }
        }

        function deleteBox(idx, e) {
            if (e) e.stopPropagation();
            pushHistory(); // Record state before deleting box
            const removed = currentBoxes.splice(idx, 1);
            if (selectedBoxIndex === idx) selectedBoxIndex = -1;
            else if (selectedBoxIndex > idx) selectedBoxIndex--;
            selectedBoxIndices = selectedBoxIndices.filter(i => i !== idx).map(i => (i > idx ? i - 1 : i));
            isDirty = true;
            redraw();
            updateBoxesList();
            showToast(`Deleted box`);
        }

        function clearBoxes() {
            if (currentBoxes.length === 0) return;
            if (confirm("Delete ALL bounding boxes on this document?")) {
                pushHistory(); // Record state before clearing all boxes
                currentBoxes = [];
                selectedBoxIndex = -1;
                selectedBoxIndices = [];
                isDirty = true;
                redraw();
                updateBoxesList();
                showToast("Cleared all boxes");
            }
        }

        // --- COPY / CLONE BOUNDING BOXES FROM ANOTHER DOCUMENT ---
        function openCopyBoxesModal() {
            if (!filteredImages || filteredImages.length === 0) {
                showToast("No documents loaded to copy from!", true);
                return;
            }
            const currentItem = filteredImages[currentIndex];
            document.getElementById('copy-target-display').value = `${currentItem.file_name} (${originalImgWidth}x${originalImgHeight})`;
            
            const select = document.getElementById('copy-source-select');
            select.innerHTML = "";

            // Suggest counterparts first (e.g., if current is case_s_001, recommend case_p_001)
            let recommendedVal = "";
            let currentBase = currentItem.file_name.toLowerCase();
            let counterpartName = "";
            if (currentBase.includes('_s_')) counterpartName = currentBase.replace('_s_', '_p_');
            else if (currentBase.includes('_p_')) counterpartName = currentBase.replace('_p_', '_s_');

            allImages.forEach(imgItem => {
                if (imgItem.file_name === currentItem.file_name) return; // don't copy from self
                const opt = document.createElement('option');
                opt.value = imgItem.file_name;
                const isRecommended = counterpartName && imgItem.file_name.toLowerCase() === counterpartName;
                opt.innerText = (isRecommended ? "⭐ (Counterpart) " : "") + `${imgItem.file_name} [${imgItem.category} / ${imgItem.mode}]`;
                if (isRecommended && !recommendedVal) {
                    recommendedVal = imgItem.file_name;
                }
                select.appendChild(opt);
            });

            if (recommendedVal) {
                select.value = recommendedVal;
            }

            document.getElementById('copy-boxes-modal').style.display = 'flex';
        }

        function closeCopyBoxesModal() {
            document.getElementById('copy-boxes-modal').style.display = 'none';
        }

        function executeCopyBoxes() {
            const select = document.getElementById('copy-source-select');
            const sourceFileName = select.value;
            if (!sourceFileName) {
                showToast("Please choose a source document!", true);
                return;
            }

            const copyText = document.getElementById('copy-include-text').checked;
            const replaceExisting = document.getElementById('copy-replace-existing').checked;
            const customCsv = document.getElementById('custom-csv-path').value.trim();
            const customOcrCsv = document.getElementById('custom-ocr-csv-path').value.trim();

            showToast(`Fetching bounding boxes from ${sourceFileName}...`);

            fetch(`/api/get_boxes?file_name=${encodeURIComponent(sourceFileName)}&csv_path=${encodeURIComponent(customCsv)}&ocr_csv_path=${encodeURIComponent(customOcrCsv)}`)
                .then(res => res.json())
                .then(sourceBoxes => {
                    if (!sourceBoxes || sourceBoxes.length === 0) {
                        showToast(`No boxes found in ${sourceFileName}!`, true);
                        return;
                    }

                    // Find source image dimensions from sourceBoxes or inspect source image width/height
                    let srcW = parseInt(sourceBoxes[0].image_width) || 0;
                    let srcH = parseInt(sourceBoxes[0].image_height) || 0;

                    let scaleX = 1.0;
                    let scaleY = 1.0;
                    if (srcW > 0 && srcH > 0 && originalImgWidth > 0 && originalImgHeight > 0) {
                        scaleX = originalImgWidth / srcW;
                        scaleY = originalImgHeight / srcH;
                    }

                    const adaptedBoxes = sourceBoxes.map(sb => {
                        return {
                            bbox_x: Math.round(sb.bbox_x * scaleX),
                            bbox_y: Math.round(sb.bbox_y * scaleY),
                            bbox_width: Math.round(sb.bbox_width * scaleX),
                            bbox_height: Math.round(sb.bbox_height * scaleY),
                            label_name: sb.label_name || 'unlabeled',
                            box_type: sb.box_type || 'FORM_SECTION',
                            transcription_text: copyText ? (sb.transcription_text || '') : '',
                            transcription_quality_notes: copyText ? (sb.transcription_quality_notes || '') : '',
                            image_width: originalImgWidth,
                            image_height: originalImgHeight
                        };
                    });

                    pushHistory(); // Record state before copying/applying external boxes
                    if (replaceExisting) {
                        currentBoxes = adaptedBoxes;
                    } else {
                        currentBoxes = currentBoxes.concat(adaptedBoxes);
                    }

                    selectedBoxIndex = -1;
                    selectedBoxIndices = [];
                    isDirty = true;
                    redraw();
                    updateBoxesList();
                    closeCopyBoxesModal();
                    showToast(`Copied ${adaptedBoxes.length} boxes from ${sourceFileName}! Press Save & Export when ready.`);
                })
                .catch(err => {
                    console.error("Error copying boxes:", err);
                    showToast("Failed to copy boxes from source file", true);
                });
        }

        function triggerSaveExport(showToastOnSave = true) {
            const exportCsv = document.getElementById('opt-export-csv').checked;
            const exportOcr = document.getElementById('opt-export-ocr').checked;
            const exportImg = document.getElementById('opt-export-img').checked;
            const customCsv = document.getElementById('custom-csv-path').value.trim();
            const customOcrCsv = document.getElementById('custom-ocr-csv-path').value.trim();
            const customImgDir = document.getElementById('custom-img-dir').value.trim();

            if (!exportCsv && !exportOcr && !exportImg) {
                if (showToastOnSave) showToast("Check at least Detection CSV, OCR CSV, or Image export!", true);
                return;
            }

            saveStatus.innerText = "Exporting...";
            fetch('/api/save_boxes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_name: filteredImages[currentIndex].file_name,
                    relative_path: filteredImages[currentIndex].relative_path,
                    boxes: currentBoxes,
                    export_csv: exportCsv,
                    export_ocr: exportOcr,
                    export_img: exportImg,
                    custom_csv_path: customCsv,
                    custom_ocr_csv_path: customOcrCsv,
                    custom_img_dir: customImgDir
                })
            })
            .then(res => res.json())
            .then(res => {
                if (res.status === 'ok') {
                    isDirty = false;
                    saveStatus.innerText = `Saved ${currentBoxes.length} boxes`;
                    const savedFileName = filteredImages[currentIndex] ? filteredImages[currentIndex].file_name : null;
                    if (showToastOnSave) {
                        let summary = `Saved ${currentBoxes.length} items! [`;
                        if (exportCsv) summary += "Detection ";
                        if (exportOcr) summary += "OCR ";
                        if (exportImg) summary += "JPG ";
                        summary += "Exported]";
                        showToast(summary);
                    }
                    // Refresh images list & counts in background so ✅ status is immediately reflected
                    refreshImagesList(savedFileName);
                } else if (res.status === 'warning') {
                    isDirty = false;
                    saveStatus.innerText = "Saved with warning";
                    showToast(res.message, true);
                } else {
                    saveStatus.innerText = "Save failed";
                    if (showToastOnSave) showToast(res.message || "Failed to save", true);
                }
            })
            .catch(err => {
                saveStatus.innerText = "Server error";
                if (showToastOnSave) showToast("Error connecting to server", true);
            });
        }
    </script>
</body>
</html>
"""

@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)

@app.route('/api/labels', methods=['GET', 'POST'])
def api_labels():
    if request.method == 'POST':
        data = request.json.get('labels', [])
        save_labels_to_disk(data)
        return jsonify({'status': 'ok'})
    return jsonify(load_labels())

@app.route('/api/box_types', methods=['GET', 'POST'])
def api_box_types():
    if request.method == 'POST':
        data = request.json.get('box_types', [])
        save_box_types_to_disk(data)
        return jsonify({'status': 'ok'})
    return jsonify(load_box_types())

@app.route('/api/images')
def api_images():
    csv_path = request.args.get('csv_path')
    return jsonify(get_all_images(csv_path))


@app.route('/api/image_file')
def api_image_file():
    path_str = request.args.get('path')
    if path_str is not None and os.path.exists(path_str):
        return send_file(path_str)
    return "Not Found", 404

@app.route('/api/pick_file')
def api_pick_file():
    file_type = request.args.get('file_type', 'all')
    try:
        dialog_script = Path(__file__).resolve().parent / "file_picker_dialog.py"
        res = subprocess.run([sys.executable, str(dialog_script), 'file'], capture_output=True, text=True)
        chosen = res.stdout.strip()
        if chosen:
            rel = os.path.relpath(chosen, os.getcwd()).replace('\\', '/')
            return jsonify({'status': 'ok', 'path': rel})
        return jsonify({'status': 'cancelled', 'path': None})
    except Exception as e:
        return jsonify({'status': 'error', 'error': str(e)}), 500

@app.route('/api/pick_folder')
def api_pick_folder():
    try:
        dialog_script = Path(__file__).resolve().parent / "file_picker_dialog.py"
        res = subprocess.run([sys.executable, str(dialog_script), 'folder'], capture_output=True, text=True)
        chosen = res.stdout.strip()
        if chosen:
            rel = os.path.relpath(chosen, os.getcwd()).replace('\\', '/')
            return jsonify({'status': 'ok', 'path': rel})
        return jsonify({'status': 'cancelled', 'path': None})
    except Exception as e:
        return jsonify({'status': 'error', 'error': str(e)}), 500

@app.route('/api/get_boxes')
def api_get_boxes():
    file_name = request.args.get('file_name')
    csv_path_str = request.args.get('csv_path') or str(DEFAULT_CSV)
    ocr_csv_path_str = request.args.get('ocr_csv_path') or str(DEFAULT_OCR_CSV)
    target_csv = Path(csv_path_str)
    target_ocr_csv = Path(ocr_csv_path_str)
    
    boxes = []
    if target_csv.exists():
        try:
            df = pd.read_csv(target_csv)
            df = df.fillna('')
            if 'file_name' in df.columns:
                sub = df[df['file_name'] == file_name]
                boxes = sub.to_dict(orient='records')
            elif 'image_name' in df.columns:
                sub = df[df['image_name'] == file_name]
                boxes = sub.to_dict(orient='records')
        except Exception:
            boxes = []
            
    # Merge existing transcriptions if OCR transcription CSV exists
    if target_ocr_csv.exists() and boxes:
        try:
            ocr_df = pd.read_csv(target_ocr_csv)
            ocr_df = ocr_df.fillna('')
            if 'file_name' in ocr_df.columns:
                file_ocr = ocr_df[ocr_df['file_name'] == file_name]
                # Match by box_id or annotation_id
                ocr_map = {}
                notes_map = {}
                for _, row in file_ocr.iterrows():
                    bid = row.get('box_id')
                    text = str(row.get('ground_truth_transcription') or row.get('ocr_predicted_text') or '')
                    if text == 'nan':
                        text = ''
                    note = str(row.get('transcription_quality_notes') or '')
                    if note == 'nan':
                        note = ''
                    if bid != '' and pd.notna(bid) and str(bid) != 'nan':
                        try:
                            clean_bid = int(float(bid))
                            ocr_map[clean_bid] = text
                            ocr_map[str(clean_bid)] = text
                            ocr_map[f"{clean_bid}.0"] = text
                            notes_map[clean_bid] = note
                            notes_map[str(clean_bid)] = note
                            notes_map[f"{clean_bid}.0"] = note
                        except Exception:
                            ocr_map[str(bid)] = text
                            notes_map[str(bid)] = note
                    ann_id = str(row.get('transcription_id') or row.get('annotation_id') or '')
                    if ann_id and ann_id != 'nan':
                        ocr_map[ann_id] = text
                        notes_map[ann_id] = note

                for idx, b in enumerate(boxes, start=1):
                    raw_bid = b.get('box_id', idx)
                    ann_id = str(b.get('annotation_id', ''))
                    try:
                        clean_bid = int(float(raw_bid))
                    except Exception:
                        clean_bid = idx
                    
                    found_text = None
                    for k in [clean_bid, str(clean_bid), f"{clean_bid}.0", str(raw_bid), ann_id]:
                        if k in ocr_map:
                            found_text = ocr_map[k]
                            b['transcription_quality_notes'] = notes_map.get(k, '')
                            break
                    if found_text is not None:
                        b['transcription_text'] = found_text
        except Exception:
            pass

    return jsonify(boxes)

@app.route('/api/save_boxes', methods=['POST'])
def api_save_boxes():
    data = request.json
    file_name = data.get('file_name')
    rel_path = data.get('relative_path')
    boxes = data.get('boxes', [])
    export_csv = data.get('export_csv', True)
    export_ocr = data.get('export_ocr', True)
    export_img = data.get('export_img', True)
    
    custom_csv = Path(data.get('custom_csv_path') or str(DEFAULT_CSV))
    custom_ocr_csv = Path(data.get('custom_ocr_csv_path') or str(DEFAULT_OCR_CSV))
    custom_img_dir = Path(data.get('custom_img_dir') or str(DEFAULT_VIS_DIR))

    doc_category = "assessment"
    if "case_study" in rel_path.lower(): doc_category = "case_study"
    elif "clinical_abstract" in rel_path.lower(): doc_category = "clinical_abstract"
    elif "expense_receipt" in rel_path.lower(): doc_category = "expense_receipt"
    elif "hospital_bill" in rel_path.lower(): doc_category = "hospital_bill"
    elif "medical_certificate" in rel_path.lower(): doc_category = "medical_certificate"
    elif "prescription" in rel_path.lower(): doc_category = "prescription"
    elif "treatment_plan" in rel_path.lower(): doc_category = "treatment_plan"

    stem = Path(file_name).stem

    # 1. SAVE DETECTION CSV
    if export_csv:
        custom_csv.parent.mkdir(parents=True, exist_ok=True)
        if custom_csv.exists() and custom_csv.stat().st_size > 0:
            try:
                df = pd.read_csv(custom_csv)
                if 'file_name' in df.columns:
                    df = df[df['file_name'] != file_name]
                elif 'image_name' in df.columns:
                    df = df[df['image_name'] != file_name]
            except Exception:
                df = pd.DataFrame()
        else:
            df = pd.DataFrame()

        if boxes:
            formatted_records = []
            for idx, b in enumerate(boxes, start=1):
                raw_type = str(b.get('box_type') or '').strip()
                b_lbl = str(b.get('label_name', '')).strip().lower()
                b_trans = str(b.get('transcription_text') or '').strip()
                if raw_type and raw_type in ['FORM_SECTION', 'HANDWRITTEN_ENTRY', 'CHECKMARK_OR_CHECKBOX', 'SIGNATURE', 'STAMP_OR_SEAL', 'TABLE_CELL']:
                    b_type = raw_type
                elif b_lbl.startswith('family_member'):
                    b_type = 'TABLE_CELL'
                elif '[signature]' in b_trans.lower() or ('sign' in b_lbl and 'name' not in b_lbl and 'title' not in b_lbl):
                    b_type = 'SIGNATURE'
                elif '[seal]' in b_trans.lower() or '[stamp]' in b_trans.lower() or 'seal' in b_lbl or 'stamp' in b_lbl:
                    b_type = 'STAMP_OR_SEAL'
                elif '[✓]' in b_trans or '[ ]' in b_trans or b_trans == '✓' or 'check' in b_lbl:
                    b_type = 'CHECKMARK_OR_CHECKBOX'
                else:
                    b_type = 'FORM_SECTION'
                formatted_records.append({
                    'annotation_id': f"DET_{stem}_{idx:02d}",
                    'file_name': file_name,
                    'relative_path': rel_path,
                    'document_category': doc_category,
                    'box_id': idx,
                    'bbox_x': int(b.get('bbox_x', 0)),
                    'bbox_y': int(b.get('bbox_y', 0)),
                    'bbox_width': int(b.get('bbox_width', 0)),
                    'bbox_height': int(b.get('bbox_height', 0)),
                    'box_type': b_type,
                    'confidence_score': "",
                    'annotation_status': 'VERIFIED',
                    'label_name': str(b.get('label_name', 'unlabeled')),
                    'image_name': file_name,
                    'image_width': int(b.get('image_width', 0)),
                    'image_height': int(b.get('image_height', 0))
                })

            new_df = pd.DataFrame(formatted_records)
            df = pd.concat([df, new_df], ignore_index=True)
        
        try:
            df.to_csv(custom_csv, index=False)
        except PermissionError:
            import time
            fallback_csv = custom_csv.parent / f"{custom_csv.stem}_saved_{int(time.time())}.csv"
            df.to_csv(fallback_csv, index=False)
            return jsonify({
                'status': 'warning',
                'message': f'Detection CSV is locked by Excel! Saved to backup: {fallback_csv.name}. Please close Excel.',
                'saved_path': str(fallback_csv)
            })
        except Exception as e:
            return jsonify({'status': 'error', 'message': f'Detection CSV Save Error: {str(e)}'}), 500

    # 2. SAVE OCR TRANSCRIPTION CSV
    if export_ocr:
        custom_ocr_csv.parent.mkdir(parents=True, exist_ok=True)
        if custom_ocr_csv.exists() and custom_ocr_csv.stat().st_size > 0:
            try:
                ocr_df = pd.read_csv(custom_ocr_csv)
                if 'file_name' in ocr_df.columns:
                    ocr_df = ocr_df[ocr_df['file_name'] != file_name]
            except Exception:
                ocr_df = pd.DataFrame()
        else:
            ocr_df = pd.DataFrame()

        if boxes:
            ocr_records = []
            for idx, b in enumerate(boxes, start=1):
                raw_type = str(b.get('box_type') or '').strip()
                b_lbl = str(b.get('label_name', '')).strip().lower()
                trans_text = str(b.get('transcription_text') or '').strip()
                if raw_type and raw_type in ['FORM_SECTION', 'HANDWRITTEN_ENTRY', 'CHECKMARK_OR_CHECKBOX', 'SIGNATURE', 'STAMP_OR_SEAL', 'TABLE_CELL']:
                    b_type = raw_type
                elif b_lbl.startswith('family_member'):
                    b_type = 'TABLE_CELL'
                elif '[signature]' in trans_text.lower() or ('sign' in b_lbl and 'name' not in b_lbl and 'title' not in b_lbl):
                    b_type = 'SIGNATURE'
                elif '[seal]' in trans_text.lower() or '[stamp]' in trans_text.lower() or 'seal' in b_lbl or 'stamp' in b_lbl:
                    b_type = 'STAMP_OR_SEAL'
                elif '[✓]' in trans_text or '[ ]' in trans_text or trans_text == '✓' or 'check' in b_lbl:
                    b_type = 'CHECKMARK_OR_CHECKBOX'
                else:
                    b_type = 'FORM_SECTION'

                if b_type in ['FORM_SECTION', 'TABLE_CELL', 'CHECKMARK_OR_CHECKBOX', 'STAMP_OR_SEAL']:
                    modality = 'printed'
                elif b_type in ['HANDWRITTEN_ENTRY', 'SIGNATURE']:
                    modality = 'handwritten'
                else:
                    modality = 'printed'
                
                # Quality notes with support for mismatch/error annotations
                q_note = str(b.get('transcription_quality_notes') or '').strip()
                if not q_note:
                    q_note = 'Manual human ground truth'

                ocr_records.append({
                    'transcription_id': f"TRN_{stem}_{idx:02d}",
                    'file_name': file_name,
                    'relative_path': rel_path,
                    'document_category': doc_category,
                    'box_id': idx,
                    'label_name': str(b.get('label_name', 'unlabeled')),
                    'box_type': b_type,
                    'text_modality': modality,
                    'ocr_predicted_text': "",
                    'ground_truth_transcription': trans_text,
                    'character_error_rate_cer': "",
                    'word_error_rate_wer': "",
                    'is_fully_transcribed': (trans_text != ''),
                    'transcription_quality_notes': q_note
                })

            new_ocr_df = pd.DataFrame(ocr_records)
            ocr_df = pd.concat([ocr_df, new_ocr_df], ignore_index=True)

        try:
            ocr_df.to_csv(custom_ocr_csv, index=False)
        except PermissionError:
            import time
            fallback_ocr = custom_ocr_csv.parent / f"{custom_ocr_csv.stem}_saved_{int(time.time())}.csv"
            ocr_df.to_csv(fallback_ocr, index=False)
            return jsonify({
                'status': 'warning',
                'message': f'OCR CSV is locked by Excel! Saved to backup: {fallback_ocr.name}. Please close Excel.',
                'saved_path': str(fallback_ocr)
            })
        except Exception as e:
            return jsonify({'status': 'error', 'message': f'OCR CSV Save Error: {str(e)}'}), 500

    if export_img and os.path.exists(rel_path) and boxes:
        custom_img_dir.mkdir(parents=True, exist_ok=True)
        img = cv2.imread(rel_path)
        palette_bgr = [
            (255, 229, 0),   # Cyan (BGR)
            (11, 158, 245),  # Amber (BGR)
            (129, 185, 16),  # Emerald (BGR)
            (153, 72, 236),  # Pink (BGR)
            (246, 92, 139),  # Violet (BGR)
            (212, 182, 6),   # Teal (BGR)
            (72, 29, 225),   # Rose (BGR)
            (22, 204, 132),  # Lime (BGR)
            (246, 130, 59)   # Blue (BGR)
        ]
        if img is not None:
            for b in boxes:
                x = int(b['bbox_x'])
                y = int(b['bbox_y'])
                bw = int(b['bbox_width'])
                bh = int(b['bbox_height'])
                lbl = str(b.get('label_name', ''))
                
                # Class color hash
                ch = abs(sum(ord(c) for c in lbl)) % len(palette_bgr)
                color = palette_bgr[ch]
                
                # Bounding box border
                cv2.rectangle(img, (x, y), (x + bw, y + bh), color, 3)
                
                # Top edge label badge
                font_scale = 0.55
                thickness = 1
                (tw, th), baseline = cv2.getTextSize(lbl, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)
                badge_h = th + baseline + 8
                badge_w = tw + 10
                badge_y1 = max(0, y - badge_h)
                badge_y2 = y
                cv2.rectangle(img, (x, badge_y1), (x + badge_w, badge_y2), color, -1) # Solid pill
                # Crisp black text inside badge
                cv2.putText(img, lbl, (x + 5, badge_y2 - baseline - 2), cv2.FONT_HERSHEY_SIMPLEX, font_scale, (0, 0, 0), thickness, cv2.LINE_AA)
                
            # Mirror the exact folder structure/distinction as the source image
            try:
                rel_p = Path(rel_path)
                p_parts = list(rel_p.parts)
                if 'supporting_docu' in p_parts:
                    idx = p_parts.index('supporting_docu')
                    sub_parts = p_parts[idx+1:-1]
                else:
                    sub_parts = [p_parts[-3], p_parts[-2]] if len(p_parts) >= 3 else [doc_category]
                
                # If custom_img_dir ends with 'bounding_box_visualizations', append mode/category
                # Otherwise, if the user explicitly picked a custom folder that already ends with a mode, mirror category
                sub_folder_path = Path(*sub_parts) if sub_parts else Path(doc_category)
                out_dir = custom_img_dir / sub_folder_path
            except Exception:
                out_dir = custom_img_dir

            out_dir.mkdir(parents=True, exist_ok=True)
            vis_out = out_dir / f"{Path(file_name).stem}_annotated.jpg"
            cv2.imwrite(str(vis_out), img)

    return jsonify({'status': 'ok', 'saved_count': len(boxes)})

@app.route('/api/ai_detect_boxes', methods=['POST'])
def api_ai_detect_boxes():
    data = request.json
    rel_path = data.get('relative_path')
    active_label = data.get('active_label', 'auto_detected')
    
    if not os.path.exists(rel_path):
        return jsonify({'status': 'error', 'boxes': []})
    
    img = cv2.imread(rel_path)
    if img is None:
        return jsonify({'status': 'error', 'boxes': []})
    
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Dual-Kernel Multi-Scale detection:
    # 1. Multi-band adaptive threshold to capture light pencil / ballpen strokes
    adapt_gauss = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 15, 6)
    adapt_mean = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 25, 10)
    thresh = cv2.bitwise_or(adapt_gauss, adapt_mean)
    
    # 2. Kernel for printed lines
    k_print = cv2.getStructuringElement(cv2.MORPH_RECT, (20, 3))
    morph_print = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, k_print)
    
    # 3. Kernel for cursive handwriting / loops
    k_hand = cv2.getStructuringElement(cv2.MORPH_RECT, (8, 4))
    morph_hand = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, k_hand)
    
    combined_morph = cv2.bitwise_or(morph_print, morph_hand)
    contours, _ = cv2.findContours(combined_morph, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    ai_boxes = []
    file_name = Path(rel_path).name
    
    for cnt in contours:
        x, y, bw, bh = cv2.boundingRect(cnt)
        # Filter noise dots and huge page borders
        if bw > 30 and 10 < bh < 140 and bw < (w * 0.95):
            ai_boxes.append({
                'label_name': active_label,
                'bbox_x': x,
                'bbox_y': y,
                'bbox_width': bw,
                'bbox_height': bh,
                'image_name': file_name,
                'image_width': w,
                'image_height': h
            })
            
    # Sort top-to-bottom
    ai_boxes = sorted(ai_boxes, key=lambda b: (b['bbox_y'] // 25, b['bbox_x']))
    return jsonify({'status': 'ok', 'boxes': ai_boxes[:45]})

def find_counterpart_file(file_path, target_mode=None):
    if not file_path:
        return None
    p = Path(file_path)
    parts = list(p.parts)
    stem = p.stem
    
    if 'physical_capture' in parts:
        source_mode = 'physical_capture'
        target_mode = target_mode or 'scan_capture'
        mode_idx = parts.index('physical_capture')
    elif 'scan_capture' in parts:
        source_mode = 'scan_capture'
        target_mode = target_mode or 'physical_capture'
        mode_idx = parts.index('scan_capture')
    else:
        return None
        
    candidate_stems = []
    if source_mode == 'physical_capture':
        if '_p_' in stem:
            candidate_stems.append(stem.replace('_p_', '_s_'))
        if stem.endswith('_p'):
            candidate_stems.append(stem[:-2] + '_s')
    else:
        if '_s_' in stem:
            candidate_stems.append(stem.replace('_s_', '_p_'))
        if stem.endswith('_s'):
            candidate_stems.append(stem[:-2] + '_p')
            
    if stem not in candidate_stems:
        candidate_stems.append(stem)
        
    parts[mode_idx] = target_mode
    target_dir = DOC_DIR / Path(*parts[mode_idx:-1])
    if not target_dir.exists():
        return None
        
    for c_stem in candidate_stems:
        for ext in ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG']:
            cand = target_dir / f"{c_stem}{ext}"
            if cand.is_file():
                return cand
        matches = list(target_dir.glob(f"{c_stem}.*"))
        if matches and matches[0].is_file():
            return matches[0]
            
    return None

def get_image_dimensions(img_path):
    try:
        from PIL import Image
        with Image.open(img_path) as img:
            return img.width, img.height
    except Exception:
        pass
    try:
        im = cv2.imread(str(img_path))
        if im is not None:
            return int(im.shape[1]), int(im.shape[0])
    except Exception:
        pass
    return 0, 0

@app.route('/api/get_counterpart_info')
def api_get_counterpart_info():
    rel_path = request.args.get('path', '')
    if not rel_path:
        return jsonify({'has_counterpart': False})
        
    p = Path(rel_path)
    direction = 'scan' if 'physical_capture' in p.parts else ('physical' if 'scan_capture' in p.parts else None)
    if not direction:
        return jsonify({'has_counterpart': False})
        
    cp_path = find_counterpart_file(rel_path)
    if not cp_path or not cp_path.is_file():
        return jsonify({'has_counterpart': False})
        
    cp_rel = str(cp_path).replace('\\', '/')
    sw, sh = get_image_dimensions(rel_path)
    tw, th = get_image_dimensions(cp_path)
        
    return jsonify({
        'has_counterpart': True,
        'direction': direction,
        'counterpart_name': cp_path.name,
        'counterpart_rel_path': cp_rel,
        'source_dimensions': {'width': sw, 'height': sh},
        'target_dimensions': {'width': tw, 'height': th}
    })

@app.route('/api/copy_counterpart_boxes', methods=['POST'])
def api_copy_counterpart_boxes():
    data = request.json or {}
    source_boxes = data.get('boxes', [])
    source_w = float(data.get('source_width') or 1)
    source_h = float(data.get('source_height') or 1)
    target_w = float(data.get('target_width') or 1)
    target_h = float(data.get('target_height') or 1)
    
    scale_x = target_w / source_w
    scale_y = target_h / source_h
    
    scaled_boxes = []
    for b in source_boxes:
        nb = dict(b)
        nx = max(0, round(int(b.get('bbox_x', 0)) * scale_x))
        ny = max(0, round(int(b.get('bbox_y', 0)) * scale_y))
        nw = max(5, round(int(b.get('bbox_width', 0)) * scale_x))
        nh = max(5, round(int(b.get('bbox_height', 0)) * scale_y))
        if nx + nw > target_w: nw = max(5, int(target_w - nx))
        if ny + nh > target_h: nh = max(5, int(target_h - ny))
        nb['bbox_x'] = nx
        nb['bbox_y'] = ny
        nb['bbox_width'] = nw
        nb['bbox_height'] = nh
        nb['image_width'] = int(target_w)
        nb['image_height'] = int(target_h)
        scaled_boxes.append(nb)
        
    return jsonify({'status': 'ok', 'boxes': scaled_boxes})

@app.route('/api/get_batch_counterpart_summary')
def api_get_batch_counterpart_summary():
    category = request.args.get('category', '').strip()
    direction = request.args.get('direction', 'physical_to_scan').strip()
    csv_path = Path(request.args.get('csv_path') or str(DEFAULT_CSV))
    ocr_csv_path = Path(request.args.get('ocr_csv_path') or str(DEFAULT_OCR_CSV))
    
    if not category:
        return jsonify({'status': 'error', 'message': 'Category is required'}), 400
        
    source_mode = 'physical_capture' if direction == 'physical_to_scan' else 'scan_capture'
    target_mode = 'scan_capture' if direction == 'physical_to_scan' else 'physical_capture'
    
    source_dir = DOC_DIR / source_mode / category
    target_dir = DOC_DIR / target_mode / category
    
    valid_exts = {'.jpg', '.jpeg', '.png'}
    source_files = [f for f in sorted(source_dir.glob('*')) if f.is_file() and f.suffix.lower() in valid_exts] if source_dir.exists() else []
    
    # Read annotation counts from CSVs
    det_stats = {}
    if csv_path.exists():
        try:
            df = pd.read_csv(csv_path)
            col = 'file_name' if 'file_name' in df.columns else ('image_name' if 'image_name' in df.columns else None)
            if col:
                counts = df[col].value_counts().to_dict()
                det_stats = {str(k): int(v) for k, v in counts.items()}
        except Exception:
            pass

    annotated_source_count = 0
    total_source_boxes = 0
    matched_counterparts = 0
    matched_annotated_count = 0
    already_annotated_targets = 0
    
    for sf in source_files:
        box_count = det_stats.get(sf.name, 0)
        if box_count > 0:
            annotated_source_count += 1
            total_source_boxes += box_count
            
        cp = find_counterpart_file(sf, target_mode=target_mode)
        if cp:
            matched_counterparts += 1
            if box_count > 0:
                matched_annotated_count += 1
            if det_stats.get(cp.name, 0) > 0:
                already_annotated_targets += 1
                
    return jsonify({
        'status': 'ok',
        'category': category,
        'direction': direction,
        'source_mode': source_mode,
        'target_mode': target_mode,
        'total_source_files': len(source_files),
        'annotated_source_files': annotated_source_count,
        'total_source_boxes': total_source_boxes,
        'matched_counterparts': matched_counterparts,
        'matched_annotated_count': matched_annotated_count,
        'transferable_files_count': matched_annotated_count,
        'already_annotated_targets': already_annotated_targets
    })

@app.route('/api/batch_copy_counterparts', methods=['POST'])
def api_batch_copy_counterparts():
    data = request.json or {}
    category = data.get('category', '').strip()
    direction = data.get('direction', 'physical_to_scan').strip()
    overwrite = bool(data.get('overwrite', True))
    export_img = bool(data.get('export_img', True))
    
    custom_csv = Path(data.get('custom_csv_path') or str(DEFAULT_CSV))
    custom_ocr_csv = Path(data.get('custom_ocr_csv_path') or str(DEFAULT_OCR_CSV))
    custom_img_dir = Path(data.get('custom_img_dir') or str(DEFAULT_VIS_DIR))
    
    if not category:
        return jsonify({'status': 'error', 'message': 'Category is required'}), 400
        
    source_mode = 'physical_capture' if direction == 'physical_to_scan' else 'scan_capture'
    target_mode = 'scan_capture' if direction == 'physical_to_scan' else 'physical_capture'
    
    source_dir = DOC_DIR / source_mode / category
    target_dir = DOC_DIR / target_mode / category
    
    if not source_dir.exists():
        return jsonify({'status': 'error', 'message': f'Source directory {source_dir} not found'}), 404
        
    # Read CSVs
    if not custom_csv.exists():
        return jsonify({'status': 'error', 'message': f'Detection CSV {custom_csv} not found'}), 404
        
    try:
        det_df = pd.read_csv(custom_csv)
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Error reading Detection CSV: {str(e)}'}), 500
        
    ocr_df = pd.DataFrame()
    if custom_ocr_csv.exists():
        try:
            ocr_df = pd.read_csv(custom_ocr_csv)
        except Exception:
            ocr_df = pd.DataFrame()
            
    # Timestamped Backup before modifying
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = custom_csv.parent / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    try:
        shutil.copy2(custom_csv, backup_dir / f"{custom_csv.stem}_backup_{timestamp}.csv")
        if custom_ocr_csv.exists():
            shutil.copy2(custom_ocr_csv, backup_dir / f"{custom_ocr_csv.stem}_backup_{timestamp}.csv")
    except Exception as e:
        print(f"[WARN] Failed to create backup: {e}")
        
    valid_exts = {'.jpg', '.jpeg', '.png'}
    source_files = [f for f in sorted(source_dir.glob('*')) if f.is_file() and f.suffix.lower() in valid_exts]
    
    total_boxes_transferred = 0
    copied_files = []
    skipped_files = []
    
    new_det_rows = []
    new_ocr_rows = []
    target_files_to_remove = set()
    
    # Palette for visualization export
    palette_bgr = [
        (255, 229, 0),   # Cyan (BGR)
        (11, 158, 245),  # Amber (BGR)
        (129, 185, 16),  # Emerald (BGR)
        (153, 72, 236),  # Pink (BGR)
        (246, 92, 139),  # Violet (BGR)
        (212, 182, 6),   # Teal (BGR)
        (72, 29, 225),   # Rose (BGR)
        (22, 204, 132),  # Lime (BGR)
        (246, 130, 59)   # Blue (BGR)
    ]
    
    for sf in source_files:
        s_det_rows = det_df[det_df['file_name'] == sf.name]
        if s_det_rows.empty:
            continue
            
        cp = find_counterpart_file(sf, target_mode=target_mode)
        if not cp or not cp.is_file():
            skipped_files.append({'source': sf.name, 'reason': 'No counterpart target file found'})
            continue
            
        sw, sh = get_image_dimensions(sf)
        tw, th = get_image_dimensions(cp)
        
        if sw <= 0 or sh <= 0 or tw <= 0 or th <= 0:
            skipped_files.append({'source': sf.name, 'target': cp.name, 'reason': 'Invalid image dimensions'})
            continue
            
        scale_x = float(tw) / float(sw)
        scale_y = float(th) / float(sh)
        
        target_stem = cp.stem
        target_name = cp.name
        target_rel = str(cp).replace('\\', '/')
        target_files_to_remove.add(target_name)
        
        # Sort source detection rows by box_id or top-to-bottom
        s_boxes_sorted = s_det_rows.sort_values(by=['box_id', 'bbox_y', 'bbox_x']).to_dict('records')
        
        # Prepare OCR mapping if available
        s_ocr_map = {}
        if not ocr_df.empty and 'file_name' in ocr_df.columns:
            s_ocr_rows = ocr_df[ocr_df['file_name'] == sf.name]
            for _, o_row in s_ocr_rows.iterrows():
                row_dict = o_row.to_dict()
                bid = row_dict.get('box_id')
                lbl = str(row_dict.get('label_name', ''))
                if bid is not None:
                    s_ocr_map[bid] = row_dict
                    try:
                        s_ocr_map[int(bid)] = row_dict
                        s_ocr_map[str(bid)] = row_dict
                    except (ValueError, TypeError):
                        pass
                if lbl:
                    s_ocr_map[f"lbl_{lbl}"] = row_dict
                
        transferred_boxes_for_vis = []
        
        for idx, s_box in enumerate(s_boxes_sorted, start=1):
            nx = max(0, round(int(s_box.get('bbox_x', 0)) * scale_x))
            ny = max(0, round(int(s_box.get('bbox_y', 0)) * scale_y))
            nw = max(5, round(int(s_box.get('bbox_width', 0)) * scale_x))
            nh = max(5, round(int(s_box.get('bbox_height', 0)) * scale_y))
            if nx + nw > tw: nw = max(5, tw - nx)
            if ny + nh > th: nh = max(5, th - ny)
            
            b_type = str(s_box.get('box_type', 'FORM_SECTION'))
            label_name = str(s_box.get('label_name', 'unlabeled'))
            
            # Format detection record
            new_det_rows.append({
                'annotation_id': f"DET_{target_stem}_{idx:02d}",
                'file_name': target_name,
                'relative_path': target_rel,
                'document_category': category,
                'box_id': idx,
                'bbox_x': nx,
                'bbox_y': ny,
                'bbox_width': nw,
                'bbox_height': nh,
                'box_type': b_type,
                'confidence_score': "",
                'annotation_status': 'VERIFIED',
                'label_name': label_name,
                'image_name': target_name,
                'image_width': tw,
                'image_height': th
            })
            
            # OCR record
            s_bid = s_box.get('box_id')
            ocr_match = s_ocr_map.get(s_bid)
            if ocr_match is None and s_bid is not None:
                try:
                    ocr_match = s_ocr_map.get(int(s_bid))
                except (ValueError, TypeError):
                    pass
            if ocr_match is None:
                ocr_match = s_ocr_map.get(f"lbl_{label_name}")
            
            if ocr_match is not None:
                gt_text = str(ocr_match.get('ground_truth_transcription') or '').strip()
                modality = str(ocr_match.get('text_modality') or ('printed' if any(w in b_type.lower() for w in ['form', 'print', 'table', 'check', 'seal', 'stamp']) else 'handwritten'))
                quality_notes = f"Transferred from counterpart {sf.name}"
            else:
                gt_text = ""
                modality = 'printed' if any(w in b_type.lower() for w in ['form', 'print', 'table', 'check', 'seal', 'stamp']) else 'handwritten'
                quality_notes = f"Transferred from counterpart {sf.name}"
                
            new_ocr_rows.append({
                'transcription_id': f"TRN_{target_stem}_{idx:02d}",
                'file_name': target_name,
                'relative_path': target_rel,
                'document_category': category,
                'text_modality': modality,
                'ocr_predicted_text': "",
                'ground_truth_transcription': gt_text,
                'character_error_rate_cer': "",
                'word_error_rate_wer': "",
                'is_fully_transcribed': gt_text != '',
                'transcription_quality_notes': quality_notes,
                'box_id': idx,
                'label_name': label_name,
                'box_type': b_type,
                'ocr_model_confidence': ""
            })
            
            transferred_boxes_for_vis.append({
                'bbox_x': nx, 'bbox_y': ny, 'bbox_width': nw, 'bbox_height': nh, 'label_name': label_name
            })
            
        total_boxes_transferred += len(s_boxes_sorted)
        copied_files.append({
            'source': sf.name,
            'target': target_name,
            'boxes_count': len(s_boxes_sorted)
        })
        
        # Render image visualization if requested
        if export_img and transferred_boxes_for_vis:
            try:
                vis_img = cv2.imread(str(cp))
                if vis_img is not None:
                    for b in transferred_boxes_for_vis:
                        bx, by, bw, bh = b['bbox_x'], b['bbox_y'], b['bbox_width'], b['bbox_height']
                        lbl = b['label_name']
                        ch = abs(sum(ord(c) for c in lbl)) % len(palette_bgr)
                        col = palette_bgr[ch]
                        cv2.rectangle(vis_img, (bx, by), (bx + bw, by + bh), col, 3)
                        
                        font_scale = 0.55
                        thickness = 1
                        (tw_txt, th_txt), baseline = cv2.getTextSize(lbl, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)
                        badge_h = th_txt + baseline + 8
                        badge_w = tw_txt + 10
                        badge_y1 = max(0, by - badge_h)
                        badge_y2 = by
                        cv2.rectangle(vis_img, (bx, badge_y1), (bx + badge_w, badge_y2), col, -1)
                        cv2.putText(vis_img, lbl, (bx + 5, badge_y2 - baseline - 2), cv2.FONT_HERSHEY_SIMPLEX, font_scale, (0, 0, 0), thickness, cv2.LINE_AA)
                        
                    vis_out_dir = custom_img_dir / target_mode / category
                    vis_out_dir.mkdir(parents=True, exist_ok=True)
                    vis_out_file = vis_out_dir / f"{target_stem}_annotated.jpg"
                    cv2.imwrite(str(vis_out_file), vis_img)
            except Exception as e:
                print(f"[WARN] Error rendering visualization for {target_name}: {e}")
                
    if not copied_files:
        return jsonify({
            'status': 'warning',
            'message': 'No counterpart pairs were transferred. Please check that source files are annotated and counterpart files exist.',
            'copied_files_count': 0,
            'total_boxes_copied': 0,
            'skipped_files': skipped_files
        })
        
    # Update DataFrames and Save CSVs
    if overwrite and target_files_to_remove:
        det_df = det_df[~det_df['file_name'].isin(target_files_to_remove)]
        if not ocr_df.empty and 'file_name' in ocr_df.columns:
            ocr_df = ocr_df[~ocr_df['file_name'].isin(target_files_to_remove)]
            
    if new_det_rows:
        new_det_df = pd.DataFrame(new_det_rows)
        det_df = pd.concat([det_df, new_det_df], ignore_index=True)
        
    if new_ocr_rows:
        new_ocr_df = pd.DataFrame(new_ocr_rows)
        if not ocr_df.empty:
            ocr_df = pd.concat([ocr_df, new_ocr_df], ignore_index=True)
        else:
            ocr_df = new_ocr_df
            
    try:
        det_df.to_csv(custom_csv, index=False)
        ocr_df.to_csv(custom_ocr_csv, index=False)
    except PermissionError:
        fb_det = custom_csv.parent / f"{custom_csv.stem}_batch_{int(time.time())}.csv"
        fb_ocr = custom_ocr_csv.parent / f"{custom_ocr_csv.stem}_batch_{int(time.time())}.csv"
        det_df.to_csv(fb_det, index=False)
        ocr_df.to_csv(fb_ocr, index=False)
        return jsonify({
            'status': 'warning',
            'message': f'CSV locked by another program! Saved to {fb_det.name} and {fb_ocr.name}.',
            'copied_files_count': len(copied_files),
            'total_boxes_copied': total_boxes_transferred
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Error saving CSVs: {str(e)}'}), 500
        
    return jsonify({
        'status': 'ok',
        'copied_files_count': len(copied_files),
        'total_boxes_copied': total_boxes_transferred,
        'skipped_files_count': len(skipped_files),
        'skipped_files': skipped_files,
        'backup_created': str(backup_dir)
    })

if __name__ == '__main__':
    print("[SUCCESS] OFPHIL Document Annotator Web App running on http://127.0.0.1:5050")
    app.run(host='127.0.0.1', port=5050, debug=False)
