"""
=============================================================================
APLICACIÓN DE ESCRITORIO: GENERADOR Y ANALIZADOR DE VIGAS PARA MATHCAD PRIME 11
=============================================================================
Interfaz gráfica interactiva para diseño de vigas, previsualización de esquema
con cortes de sección en tiempo real, cálculo de reacciones y compilación directa
en archivos nativos .mcdx y PDF de PTC Mathcad Prime 11.
"""

import os
import sys
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from PIL import Image, ImageTk
import io
import subprocess

# Directorios de trabajo
APP_DIR = os.path.dirname(os.path.abspath(__file__))
if APP_DIR not in sys.path:
    sys.path.append(APP_DIR)

from beam_engine import BeamModel, render_beam_diagram
from mcdx_generator import generate_mcdx_for_beam
import win32com.client

BASE_MCDX = os.path.join(APP_DIR, "PLANTILLA_MAESTRA_10_TRAMOS_CORREGIDA.mcdx")
DEFAULT_OUTPUT_MCDX = os.path.join(APP_DIR, "VIGA_SOLUCION_MATHCAD_PRIME.mcdx")
DEFAULT_OUTPUT_PDF = os.path.join(APP_DIR, "VIGA_SOLUCION_MATHCAD_PRIME.pdf")
MANUAL_FILE = os.path.join(APP_DIR, "FORMULARIO_Y_MANUAL_MATHCAD_VIGAS.md")
MATHCAD_EXE = r"C:\Program Files\PTC\Mathcad Prime 11.0.0.0\MathcadPrime.exe"

class MathcadBeamApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("PTC Mathcad Prime 11 — Generador y Analizador de Vigas (Análisis Estructural II)")
        self.geometry("1320x860")
        self.minsize(1050, 720)
        
        # Modelo de la viga
        self.beam = BeamModel()
        self.preview_image = None
        self._raw_preview_img = None
        
        # Variables de control
        self.var_num_spans = tk.IntVar(value=4)
        self.var_unit_len = tk.StringVar(value="m")
        self.var_unit_f = tk.StringVar(value="kg")
        self.var_unit_q = tk.StringVar(value="kg/m")
        self.var_unit_m = tk.StringVar(value="kg*m")
        
        self.span_entries = []
        self.support_vars = []
        self.q_entries = []
        self.p_entries = []
        self.m_entries = []
        
        self._setup_styles()
        self._create_widgets()
        self.load_preset_ejercicio_01()

    def _setup_styles(self):
        self.style = ttk.Style(self)
        self.style.theme_use('clam')
        
        # Paleta de colores de ingeniería civil
        self.COLOR_BG = "#F4F6F9"
        self.COLOR_PANEL = "#FFFFFF"
        self.COLOR_PRIMARY = "#0056B3"
        self.COLOR_SUCCESS = "#28A745"
        self.COLOR_ACCENT = "#D9534F"
        self.COLOR_TEXT = "#212529"
        
        self.configure(bg=self.COLOR_BG)
        self.style.configure(".", background=self.COLOR_BG, foreground=self.COLOR_TEXT, font=("Segoe UI", 10))
        self.style.configure("TNotebook", background=self.COLOR_BG)
        self.style.configure("TNotebook.Tab", padding=[12, 6], font=("Segoe UI", 10, "bold"))
        self.style.map("TNotebook.Tab", background=[("selected", self.COLOR_PANEL)])
        
        self.style.configure("Card.TFrame", background=self.COLOR_PANEL, relief="groove")
        self.style.configure("Action.TButton", font=("Segoe UI", 10, "bold"), padding=[10, 8])

    def _create_widgets(self):
        # 1. Barra de Encabezado Superior
        header_frame = tk.Frame(self, bg=self.COLOR_PRIMARY, height=52)
        header_frame.pack(fill=tk.X, side=tk.TOP)
        
        lbl_title = tk.Label(header_frame, text="  📐 ANÁLISIS ESTRUCTURAL II — GENERADOR PARA PTC MATHCAD PRIME 11",
                             bg=self.COLOR_PRIMARY, fg="white", font=("Segoe UI", 13, "bold"))
        lbl_title.pack(side=tk.LEFT, pady=10)
        
        btn_manual = tk.Button(header_frame, text="📖 Ver Manual y Formulario", bg="#17A2B8", fg="white",
                               font=("Segoe UI", 9, "bold"), relief="flat", command=self.open_manual, padx=12, pady=4)
        btn_manual.pack(side=tk.RIGHT, padx=15, pady=10)

        # 2. Barra de Presets Rápidos (1 clic para configurar problemas típicos de examen)
        preset_frame = tk.Frame(self, bg="#E9ECEF", height=42, relief="groove", bd=1)
        preset_frame.pack(fill=tk.X, side=tk.TOP, padx=10, pady=(6, 2))
        
        tk.Label(preset_frame, text="Plantillas Rápidas de Examen:", bg="#E9ECEF", font=("Segoe UI", 9, "bold"), fg="#495057").pack(side=tk.LEFT, padx=10)
        
        btn_p1 = tk.Button(preset_frame, text="🎯 Ejercicio 01 (Examen Oficial)", bg="#FFC107", fg="#212529",
                           font=("Segoe UI", 8, "bold"), relief="groove", command=self.load_preset_ejercicio_01, padx=8)
        btn_p1.pack(side=tk.LEFT, padx=3, pady=4)

        btn_p_user = tk.Button(preset_frame, text="⚡ Examen 3 Tramos (q=500)", bg="#E2E3E5", fg="#0C5460",
                               font=("Segoe UI", 8, "bold"), relief="groove", command=self.load_preset_viga_3_tramos_examen, padx=8)
        btn_p_user.pack(side=tk.LEFT, padx=3, pady=4)

        btn_p2 = tk.Button(preset_frame, text="🔹 Puntual Céntrica", bg="#FFFFFF", fg="#0056B3",
                           font=("Segoe UI", 8), relief="groove", command=self.load_preset_puntual, padx=8)
        btn_p2.pack(side=tk.LEFT, padx=3, pady=4)

        btn_p3 = tk.Button(preset_frame, text="🔸 Distribuida Total", bg="#FFFFFF", fg="#0056B3",
                           font=("Segoe UI", 8), relief="groove", command=self.load_preset_distribuida, padx=8)
        btn_p3.pack(side=tk.LEFT, padx=3, pady=4)

        btn_p4 = tk.Button(preset_frame, text="🔻 Cantilever (Voladizo)", bg="#FFFFFF", fg="#0056B3",
                           font=("Segoe UI", 8), relief="groove", command=self.load_preset_cantilever, padx=8)
        btn_p4.pack(side=tk.LEFT, padx=3, pady=4)

        btn_p5 = tk.Button(preset_frame, text="🔄 Doble Voladizo", bg="#FFFFFF", fg="#0056B3",
                           font=("Segoe UI", 8), relief="groove", command=self.load_preset_doble_voladizo, padx=8)
        btn_p5.pack(side=tk.LEFT, padx=3, pady=4)

        btn_p6 = tk.Button(preset_frame, text="⭐ Viga 10 Tramos Completa", bg="#FFFFFF", fg="#6F42C1",
                           font=("Segoe UI", 8, "bold"), relief="groove", command=self.load_preset_10_tramos, padx=8)
        btn_p6.pack(side=tk.LEFT, padx=3, pady=4)

        # 3. Contenedor Principal (2 Columnas)
        main_paned = ttk.PanedWindow(self, orient=tk.HORIZONTAL)
        main_paned.pack(fill=tk.BOTH, expand=True, padx=10, pady=6)

        # 3.1. Panel Izquierdo: Formulario de Datos
        left_container = ttk.Frame(main_paned, width=460)
        main_paned.add(left_container, weight=1)

        # Selector de tramos activos
        spans_sel_frame = ttk.Frame(left_container, padding=5)
        spans_sel_frame.pack(fill=tk.X, pady=(0, 5))
        ttk.Label(spans_sel_frame, text="Número de tramos (1 a 10):", font=("Segoe UI", 10, "bold")).pack(side=tk.LEFT)
        spin_spans = ttk.Spinbox(spans_sel_frame, from_=1, to=10, textvariable=self.var_num_spans, width=4,
                                 command=self.on_num_spans_changed)
        spin_spans.pack(side=tk.LEFT, padx=10)
        
        # Pestañas de entrada
        self.notebook = ttk.Notebook(left_container)
        self.notebook.pack(fill=tk.BOTH, expand=True)

        self.tab_spans = ttk.Frame(self.notebook, padding=8)
        self.tab_supports = ttk.Frame(self.notebook, padding=8)
        self.tab_q = ttk.Frame(self.notebook, padding=8)
        self.tab_p = ttk.Frame(self.notebook, padding=8)
        self.tab_m = ttk.Frame(self.notebook, padding=8)

        self.notebook.add(self.tab_spans, text="📏 Tramos (L)")
        self.notebook.add(self.tab_supports, text="⚙️ Apoyos")
        self.notebook.add(self.tab_q, text="⬇️ Distr. (q)")
        self.notebook.add(self.tab_p, text="🔴 Puntuales (P)")
        self.notebook.add(self.tab_m, text="🔄 Momentos (M)")

        # Inicializar contenido de pestañas
        self._build_tab_spans()
        self._build_tab_supports()
        self._build_tab_q()
        self._build_tab_p()
        self._build_tab_m()

        # 3.2. Panel Derecho: Visualizador de Viga y Consola de Resultados
        right_container = ttk.Frame(main_paned)
        main_paned.add(right_container, weight=2)

        # Canvas del diagrama de la viga
        preview_frame = ttk.LabelFrame(right_container, text="Esquema Estructural de la Viga y Cortes de Sección (Previsualización en Vivo)", padding=8)
        preview_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 8))

        self.lbl_canvas = tk.Label(preview_frame, bg="white", relief="sunken", bd=1)
        self.lbl_canvas.pack(fill=tk.BOTH, expand=True)
        self.lbl_canvas.bind("<Configure>", self._on_canvas_resize)

        # Caja de Resultados Analíticos
        status_frame = ttk.LabelFrame(right_container, text="Cálculo Previo de Reacciones y Equilibrio Estático", padding=10)
        status_frame.pack(fill=tk.X, pady=(0, 5))

        self.lbl_results = tk.Label(status_frame, text="", justify=tk.LEFT, font=("Consolas", 10), bg="#F8F9FA", padx=10, pady=8, relief="groove")
        self.lbl_results.pack(fill=tk.X)

        # 4. Barra de Botones de Acción Inferiores
        bottom_bar = tk.Frame(self, bg=self.COLOR_PANEL, height=65, relief="raised", bd=1)
        bottom_bar.pack(fill=tk.X, side=tk.BOTTOM, padx=10, pady=8)

        btn_open_mc = tk.Button(bottom_bar, text="🚀 GENERAR Y ABRIR EN MATHCAD PRIME 11", bg=self.COLOR_SUCCESS, fg="white",
                                font=("Segoe UI", 11, "bold"), relief="flat", padx=16, pady=8, command=self.generate_and_open_mathcad)
        btn_open_mc.pack(side=tk.LEFT, padx=10)

        btn_pdf = tk.Button(bottom_bar, text="📄 Exportar a PDF Directo", bg="#17A2B8", fg="white",
                            font=("Segoe UI", 10, "bold"), relief="flat", padx=12, pady=8, command=self.export_direct_pdf)
        btn_pdf.pack(side=tk.LEFT, padx=5)

        btn_save_as = tk.Button(bottom_bar, text="💾 Guardar como .mcdx", bg=self.COLOR_PRIMARY, fg="white",
                                font=("Segoe UI", 10, "bold"), relief="flat", padx=12, pady=8, command=self.save_mcdx_as)
        btn_save_as.pack(side=tk.LEFT, padx=5)

        btn_clear = tk.Button(bottom_bar, text="🧹 Limpiar Todo", bg="#6C757D", fg="white",
                              font=("Segoe UI", 10), relief="flat", padx=10, pady=8, command=self.clear_all)
        btn_clear.pack(side=tk.RIGHT, padx=10)

    # --- Constructores de Pestañas ---
    def _build_tab_spans(self):
        for widget in self.tab_spans.winfo_children(): widget.destroy()
        self.span_entries.clear()
        
        ttk.Label(self.tab_spans, text="Longitudes de cada tramo (metros):", font=("Segoe UI", 9, "italic")).pack(anchor=tk.W, pady=2)
        grid_frame = ttk.Frame(self.tab_spans)
        grid_frame.pack(fill=tk.X, pady=5)
        
        for i in range(10):
            lbl = ttk.Label(grid_frame, text=f"Tramo {i+1} (L{i+1}):")
            ent = ttk.Entry(grid_frame, width=8)
            ent.insert(0, "0.0")
            ent.bind("<KeyRelease>", lambda e: self.update_model_and_render())
            
            lbl_coord = ttk.Label(grid_frame, text="", foreground="#666")
            
            lbl.grid(row=i, column=0, sticky=tk.W, pady=2)
            ent.grid(row=i, column=1, padx=5, pady=2)
            lbl_coord.grid(row=i, column=2, sticky=tk.W, padx=5, pady=2)
            
            self.span_entries.append((ent, lbl_coord, lbl))

    def _build_tab_supports(self):
        for widget in self.tab_supports.winfo_children(): widget.destroy()
        self.support_vars.clear()
        
        ttk.Label(self.tab_supports, text="Condición de apoyo en cada nodo:", font=("Segoe UI", 9, "italic")).pack(anchor=tk.W, pady=2)
        grid_frame = ttk.Frame(self.tab_supports)
        grid_frame.pack(fill=tk.X, pady=5)
        
        for i in range(11):
            lbl = ttk.Label(grid_frame, text=f"Nodo {i} (N{i}):")
            var = tk.StringVar(value="Libre")
            cb = ttk.Combobox(grid_frame, textvariable=var, values=["Libre", "Apoyo Fijo (Pin)", "Apoyo Móvil (Roller)", "Empotramiento"], state="readonly", width=18)
            cb.bind("<<ComboboxSelected>>", lambda e: self.update_model_and_render())
            
            lbl.grid(row=i, column=0, sticky=tk.W, pady=2)
            cb.grid(row=i, column=1, padx=5, pady=2)
            self.support_vars.append((var, cb, lbl))

    def _build_tab_q(self):
        for widget in self.tab_q.winfo_children(): widget.destroy()
        self.q_entries.clear()
        
        ttk.Label(self.tab_q, text="Carga uniforme en cada tramo (kg/m):", font=("Segoe UI", 9, "italic")).pack(anchor=tk.W, pady=2)
        grid_frame = ttk.Frame(self.tab_q)
        grid_frame.pack(fill=tk.X, pady=5)
        
        for i in range(10):
            lbl = ttk.Label(grid_frame, text=f"Tramo {i+1} (q{i+1}):")
            ent = ttk.Entry(grid_frame, width=8)
            ent.insert(0, "0.0")
            ent.bind("<KeyRelease>", lambda e: self.update_model_and_render())
            
            lbl.grid(row=i, column=0, sticky=tk.W, pady=2)
            ent.grid(row=i, column=1, padx=5, pady=2)
            self.q_entries.append((ent, lbl))

    def _build_tab_p(self):
        for widget in self.tab_p.winfo_children(): widget.destroy()
        self.p_entries.clear()
        
        ttk.Label(self.tab_p, text="Carga puntual en cada nodo (kg):", font=("Segoe UI", 9, "italic")).pack(anchor=tk.W, pady=2)
        grid_frame = ttk.Frame(self.tab_p)
        grid_frame.pack(fill=tk.X, pady=5)
        
        for i in range(11):
            lbl = ttk.Label(grid_frame, text=f"Nodo {i} (P{i}):")
            ent = ttk.Entry(grid_frame, width=8)
            ent.insert(0, "0.0")
            ent.bind("<KeyRelease>", lambda e: self.update_model_and_render())
            
            lbl.grid(row=i, column=0, sticky=tk.W, pady=2)
            ent.grid(row=i, column=1, padx=5, pady=2)
            self.p_entries.append((ent, lbl))

    def _build_tab_m(self):
        for widget in self.tab_m.winfo_children(): widget.destroy()
        self.m_entries.clear()
        
        ttk.Label(self.tab_m, text="Momento concentrado horario (kg*m):", font=("Segoe UI", 9, "italic")).pack(anchor=tk.W, pady=2)
        grid_frame = ttk.Frame(self.tab_m)
        grid_frame.pack(fill=tk.X, pady=5)
        
        for i in range(11):
            lbl = ttk.Label(grid_frame, text=f"Nodo {i} (M{i}):")
            ent = ttk.Entry(grid_frame, width=8)
            ent.insert(0, "0.0")
            ent.bind("<KeyRelease>", lambda e: self.update_model_and_render())
            
            lbl.grid(row=i, column=0, sticky=tk.W, pady=2)
            ent.grid(row=i, column=1, padx=5, pady=2)
            self.m_entries.append((ent, lbl))

    def on_num_spans_changed(self):
        n = self.var_num_spans.get()
        for i in range(10):
            ent, lbl_c, lbl = self.span_entries[i]
            q_ent, q_lbl = self.q_entries[i]
            if i < n:
                ent.configure(state="normal")
                q_ent.configure(state="normal")
                lbl.configure(foreground="#000")
                q_lbl.configure(foreground="#000")
            else:
                ent.configure(state="disabled")
                q_ent.configure(state="disabled")
                lbl.configure(foreground="#AAA")
                q_lbl.configure(foreground="#AAA")
                
        for i in range(11):
            var, cb, lbl = self.support_vars[i]
            p_ent, p_lbl = self.p_entries[i]
            m_ent, m_lbl = self.m_entries[i]
            if i <= n:
                cb.configure(state="readonly")
                p_ent.configure(state="normal")
                m_ent.configure(state="normal")
                lbl.configure(foreground="#000")
                p_lbl.configure(foreground="#000")
                m_lbl.configure(foreground="#000")
            else:
                cb.configure(state="disabled")
                p_ent.configure(state="disabled")
                m_ent.configure(state="disabled")
                lbl.configure(foreground="#AAA")
                p_lbl.configure(foreground="#AAA")
                m_lbl.configure(foreground="#AAA")
                
        self.update_model_and_render()

    def _on_canvas_resize(self, event):
        if self._raw_preview_img is not None:
            w = max(400, event.width - 20)
            h = max(180, event.height - 20)
            img_thumb = self._raw_preview_img.resize((w, h), Image.Resampling.LANCZOS)
            self.preview_image = ImageTk.PhotoImage(img_thumb)
            self.lbl_canvas.configure(image=self.preview_image)

    def update_model_and_render(self):
        try:
            n_spans = self.var_num_spans.get()
            spans = []
            acc = 0.0
            for i in range(n_spans):
                val_str = self.span_entries[i][0].get()
                val = float(val_str) if val_str else 0.0
                spans.append(val)
                acc += val
                self.span_entries[i][1].configure(text=f"x{i+1} = {acc:.2f} m")

            self.beam.spans = spans
            
            # Apoyos
            supports = {}
            for i in range(n_spans + 1):
                txt = self.support_vars[i][0].get()
                if "Pin" in txt:
                    supports[i] = "pin"
                elif "Roller" in txt:
                    supports[i] = "roller"
                elif "Empotramiento" in txt:
                    supports[i] = "fixed"
            self.beam.supports = supports

            # Cargas distribuidas
            q_dict = {}
            for i in range(n_spans):
                val_str = self.q_entries[i][0].get()
                q_val = float(val_str) if val_str else 0.0
                if q_val > 0:
                    q_dict[i] = q_val
            self.beam.distributed_loads = q_dict

            # Cargas puntuales
            p_dict = {}
            for i in range(n_spans + 1):
                val_str = self.p_entries[i][0].get()
                p_val = float(val_str) if val_str else 0.0
                if p_val > 0:
                    p_dict[i] = p_val
            self.beam.point_loads = p_dict

            # Momentos
            m_dict = {}
            for i in range(n_spans + 1):
                val_str = self.m_entries[i][0].get()
                m_val = float(val_str) if val_str else 0.0
                if m_val != 0:
                    m_dict[i] = m_val
            self.beam.applied_moments = m_dict

            # Renderizar en canvas
            self._raw_preview_img = render_beam_diagram(self.beam, width=1300, height=380, show_cuts=True)
            w_box = max(400, self.lbl_canvas.winfo_width())
            h_box = max(200, self.lbl_canvas.winfo_height())
            img_thumb = self._raw_preview_img.resize((w_box - 20, h_box - 20), Image.Resampling.LANCZOS)
            self.preview_image = ImageTk.PhotoImage(img_thumb)
            self.lbl_canvas.configure(image=self.preview_image)

            # Actualizar resultados analíticos
            reactions = self.beam.calculate_reactions()
            r_text = (
                f"Longitud Total: {self.beam.total_length:.2f} m   |   "
                f"Reacción VA: {reactions.get('VA', 0.0):.2f} {self.beam.unit_force}   |   "
                f"Reacción VD: {reactions.get('VD', reactions.get('MA', 0.0)):.2f} {self.beam.unit_force}   |   "
                f"Equilibrio ΣFy: {'✓ EQUILIBRADO' if reactions.get('sum_fy_ok') else '⚠ DESBALANCE'}"
            )
            self.lbl_results.configure(text=r_text, fg="#00703C" if reactions.get('sum_fy_ok') else "#D00")

        except Exception as e:
            pass

    # --- Presets Rápidos ---
    def load_preset_ejercicio_01(self):
        """Carga el problema oficial del examen."""
        self.var_num_spans.set(4)
        preset_spans = [2.0, 1.0, 1.0, 1.0]
        for i in range(10):
            ent = self.span_entries[i][0]
            ent.delete(0, tk.END)
            ent.insert(0, str(preset_spans[i]) if i < 4 else "0.0")

        for i in range(11):
            if i == 0: self.support_vars[i][0].set("Apoyo Fijo (Pin)")
            elif i == 3: self.support_vars[i][0].set("Apoyo Móvil (Roller)")
            else: self.support_vars[i][0].set("Libre")

        for i in range(10):
            q_ent = self.q_entries[i][0]
            q_ent.delete(0, tk.END)
            q_ent.insert(0, "15.0" if i == 0 else "0.0")

        for i in range(11):
            p_ent = self.p_entries[i][0]
            p_ent.delete(0, tk.END)
            if i == 2: p_ent.insert(0, "20.0")
            elif i == 4: p_ent.insert(0, "8.0")
            else: p_ent.insert(0, "0.0")

        for i in range(11):
            m_ent = self.m_entries[i][0]
            m_ent.delete(0, tk.END)
            m_ent.insert(0, "10.0" if i == 1 else "0.0")

        self.on_num_spans_changed()

    def load_preset_puntual(self):
        """Viga simplemente apoyada con carga puntual céntrica."""
        self.clear_all()
        self.var_num_spans.set(2)
        for i in range(2):
            self.span_entries[i][0].delete(0, tk.END)
            self.span_entries[i][0].insert(0, "3.0")
        self.support_vars[0][0].set("Apoyo Fijo (Pin)")
        self.support_vars[2][0].set("Apoyo Móvil (Roller)")
        self.p_entries[1][0].delete(0, tk.END)
        self.p_entries[1][0].insert(0, "50.0")
        self.on_num_spans_changed()

    def load_preset_distribuida(self):
        """Viga con carga distribuida total en 3 tramos."""
        self.clear_all()
        self.var_num_spans.set(3)
        for i in range(3):
            self.span_entries[i][0].delete(0, tk.END)
            self.span_entries[i][0].insert(0, "2.0")
            self.q_entries[i][0].delete(0, tk.END)
            self.q_entries[i][0].insert(0, "12.0")
        self.support_vars[0][0].set("Apoyo Fijo (Pin)")
        self.support_vars[3][0].set("Apoyo Móvil (Roller)")
        self.on_num_spans_changed()

    def load_preset_cantilever(self):
        """Viga en voladizo (cantilever) empotrada en el origen."""
        self.clear_all()
        self.var_num_spans.set(2)
        self.span_entries[0][0].delete(0, tk.END); self.span_entries[0][0].insert(0, "3.0")
        self.span_entries[1][0].delete(0, tk.END); self.span_entries[1][0].insert(0, "2.0")
        self.support_vars[0][0].set("Empotramiento")
        self.q_entries[0][0].delete(0, tk.END); self.q_entries[0][0].insert(0, "10.0")
        self.p_entries[2][0].delete(0, tk.END); self.p_entries[2][0].insert(0, "30.0")
        self.on_num_spans_changed()

    def load_preset_doble_voladizo(self):
        """Viga con doble voladizo (apoyos interiores)."""
        self.clear_all()
        self.var_num_spans.set(4)
        lens = [1.5, 3.0, 3.0, 1.5]
        for i in range(4):
            self.span_entries[i][0].delete(0, tk.END)
            self.span_entries[i][0].insert(0, str(lens[i]))
        self.support_vars[1][0].set("Apoyo Fijo (Pin)")
        self.support_vars[3][0].set("Apoyo Móvil (Roller)")
        self.p_entries[0][0].delete(0, tk.END); self.p_entries[0][0].insert(0, "15.0")
        self.p_entries[4][0].delete(0, tk.END); self.p_entries[4][0].insert(0, "15.0")
        self.q_entries[1][0].delete(0, tk.END); self.q_entries[1][0].insert(0, "20.0")
        self.on_num_spans_changed()

    def load_preset_10_tramos(self):
        """Viga completa de 10 tramos con cargas combinadas."""
        self.clear_all()
        self.var_num_spans.set(10)
        lens = [1.2, 0.8, 1.5, 1.0, 0.5, 1.0, 1.2, 0.8, 1.0, 1.0]
        for i in range(10):
            self.span_entries[i][0].delete(0, tk.END)
            self.span_entries[i][0].insert(0, str(lens[i]))
        self.support_vars[0][0].set("Apoyo Fijo (Pin)")
        self.support_vars[8][0].set("Apoyo Móvil (Roller)")
        self.q_entries[1][0].delete(0, tk.END); self.q_entries[1][0].insert(0, "18.0")
        self.q_entries[4][0].delete(0, tk.END); self.q_entries[4][0].insert(0, "12.0")
        self.p_entries[3][0].delete(0, tk.END); self.p_entries[3][0].insert(0, "25.0")
        self.p_entries[10][0].delete(0, tk.END); self.p_entries[10][0].insert(0, "10.0")
        self.m_entries[2][0].delete(0, tk.END); self.m_entries[2][0].insert(0, "14.0")
        self.on_num_spans_changed()

    def load_preset_viga_3_tramos_examen(self):
        """Viga de Examen 3 Tramos (L=2, 4, 2m, q2=500 kg/m)."""
        self.clear_all()
        self.var_num_spans.set(3)
        lens = [2.0, 4.0, 2.0]
        for i in range(3):
            self.span_entries[i][0].delete(0, tk.END)
            self.span_entries[i][0].insert(0, str(lens[i]))
        self.support_vars[0][0].set("Apoyo Fijo (Pin)")
        self.support_vars[3][0].set("Apoyo Móvil (Roller)")
        self.q_entries[1][0].delete(0, tk.END)
        self.q_entries[1][0].insert(0, "500.0")
        self.on_num_spans_changed()

    def clear_all(self):
        for i in range(10):
            self.span_entries[i][0].delete(0, tk.END)
            self.span_entries[i][0].insert(0, "0.0")
            self.q_entries[i][0].delete(0, tk.END)
            self.q_entries[i][0].insert(0, "0.0")
        for i in range(11):
            self.support_vars[i][0].set("Libre")
            self.p_entries[i][0].delete(0, tk.END)
            self.p_entries[i][0].insert(0, "0.0")
            self.m_entries[i][0].delete(0, tk.END)
            self.m_entries[i][0].insert(0, "0.0")
        self.update_model_and_render()

    def open_manual(self):
        if os.path.exists(MANUAL_FILE):
            os.startfile(MANUAL_FILE)
        else:
            messagebox.showinfo("Manual", "El archivo de manual no se encuentra en el directorio actual.")

    def generate_and_open_mathcad(self):
        try:
            self.update_model_and_render()
            out_file = DEFAULT_OUTPUT_MCDX
            
            # 1. Generar archivo .mcdx con tolerancia a bloqueos de archivo
            try:
                generate_mcdx_for_beam(self.beam, out_file, BASE_MCDX)
            except PermissionError:
                out_file = os.path.join(APP_DIR, "VIGA_SOLUCION_MATHCAD_PRIME_CALC.mcdx")
                generate_mcdx_for_beam(self.beam, out_file, BASE_MCDX)
            
            # 2. Notificar al usuario y abrir respetando la sesión activa de Mathcad
            if os.path.exists(MATHCAD_EXE):
                subprocess.Popen([MATHCAD_EXE, os.path.abspath(out_file)])
                messagebox.showinfo("Éxito Total", f"¡Plantilla generada exitosamente!\n\nSe ha abierto en PTC Mathcad Prime 11:\n{out_file}")
            else:
                os.startfile(out_file)
                messagebox.showinfo("Generado", f"Archivo generado con éxito:\n{out_file}")

        except Exception as err:
            messagebox.showerror("Error al Generar", f"Ocurrió un error al generar la plantilla:\n{err}")

    def export_direct_pdf(self):
        try:
            self.update_model_and_render()
            out_mcdx = DEFAULT_OUTPUT_MCDX
            out_pdf = DEFAULT_OUTPUT_PDF
            generate_mcdx_for_beam(self.beam, out_mcdx, BASE_MCDX)

            mc = win32com.client.Dispatch('MathcadPrime.Application')
            prev_c = mc.Worksheets.Count
            mc.Open(os.path.abspath(out_mcdx))
            if mc.Worksheets.Count > prev_c:
                ws = mc.Worksheets.Item(mc.Worksheets.Count - 1)
                ws.Synchronize()
                ws.SaveAs(os.path.abspath(out_pdf))
                ws.Close(0)
            if prev_c == 0:
                mc.Quit(0)

            messagebox.showinfo("PDF Exportado", f"Memoria de cálculo exportada en PDF exitosamente (con gráficos DFC y DMF):\n\n{out_pdf}")
            os.startfile(out_pdf)
        except Exception as e:
            messagebox.showerror("Error al Exportar PDF", str(e))

    def save_mcdx_as(self):
        path = filedialog.asksaveasfilename(defaultextension=".mcdx", filetypes=[("Mathcad Prime Worksheet", "*.mcdx")])
        if path:
            try:
                self.update_model_and_render()
                generate_mcdx_for_beam(self.beam, path, BASE_MCDX)
                messagebox.showinfo("Guardado", f"Archivo guardado correctamente en:\n{path}")
            except Exception as e:
                messagebox.showerror("Error al Guardar", str(e))

if __name__ == '__main__':
    app = MathcadBeamApp()
    app.mainloop()
