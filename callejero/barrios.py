import pandas as pd
import re

# Cargar tu CSV original
df = pd.read_csv('callejero.csv')

# Diccionario de prefijos
prefijos = {
    'AV': 'AVENIDA', 'AL': 'ALAMEDA', 'BO': 'BARRIO', 'CA': 'CAÑADA', 'CJ': 'CALLEJON',
    'CL': 'CALLE', 'CM': 'CAMINO', 'CR': 'CARRETERA', 'CS': 'CASERIO', 'CT': 'CUESTA',
    'DS': 'DISEMINADO', 'GV': 'GRANVIA', 'JR': 'JARDINES', 'LG': 'LUGAR', 'PA': 'PASARELA',
    'PE': 'PARAJE', 'PG': 'POLIGONO', 'PL': 'POLIGONO', 'PJ': 'PASAJE', 'PR': 'PROLONGACION',
    'PS': 'PASEO', 'PZ': 'PLAZA', 'SD': 'SENDA', 'TR': 'TRAVESIA', 'UR': 'URBANIZACION',
    'VD': 'VIADUCTO', 'VR': 'VEREDA'
}

# Función para separar prefijo y limpiar vía
def separar_prefijo(via):
    match = re.match(r'^([A-Z]{2})\s+(.*)$', via.strip())
    if match:
        prefijo, nombre_via = match.groups()
        tipo_via = prefijos.get(prefijo, 'DESCONOCIDO')
        return pd.Series([tipo_via, nombre_via])
    return pd.Series(['DESCONOCIDO', via.strip()])

# Crear nueva columna formateada
df['via'] = df.apply(lambda row: f"{row['TipoVia']} {row['NombreVia']}, {row['barrio']}", axis=1)

df['ViaCatastro'] = df.apply(lambda row: f"{row['NombreVia']}({row['TipoVia']}) en {row['barrio']}", axis=1)


# Mostrar resultado
print(df[['TipoVia', 'NombreVia', 'barrio', 'via', 'ViaCatastro']].head())

nuevo_orden = ['TipoVia', 'NombreVia', 'barrio', 'via', 'ViaCatastro']  # Puedes añadir otras columnas si tienes más

# Reordenar el DataFrame
df = df[nuevo_orden]

# Guardar resultado si quieres:
df.to_csv('callejero.csv', index=False)

# Mostrar las primeras filas
print(df.head())
