import pandas as pd
import re

# Cargar calles de Murcia capital ya extraídas
df_murcia_capital = pd.read_csv("vias-murcia.csv", encoding='utf-8-sig')

# Leer el archivo de calles con barrios
barrios_dict = {}
with open('murcia_streets.txt', 'r', encoding='utf-8') as f:
    for line in f:
        match = re.match(r"^(.*) \((.*)\)", line.strip())
        if match:
            calle = match.group(1).strip()
            barrio = match.group(2).strip()
            barrios_dict[calle.upper()] = barrio.upper()

# Función para asignar barrio
def asignar_barrio(row):
    nombre_calle = f"{row['tipo_via']} {row['denominacion']}".strip().upper()
    return barrios_dict.get(nombre_calle, "DESCONOCIDO")

# Añadir la columna de barrio
df_murcia_capital['barrio'] = df_murcia_capital.apply(asignar_barrio, axis=1)

# Guardar el nuevo CSV con barrios
df_murcia_capital.to_csv("barrios.csv", index=False, encoding='utf-8-sig')

print(f"CSV creado: barrios.csv con {len(df_murcia_capital)} calles y barrios.")
