import requests
import json
import time
import pandas as pd

HEADERS = {
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'es,en-US;q=0.9,en;q=0.8,ca;q=0.7',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Content-Type': 'application/json; charset=UTF-8',
    'Origin': 'https://www1.sedecatastro.gob.es',
    'Pragma': 'no-cache',
    'Referer': 'https://www1.sedecatastro.gob.es/CYCBienInmueble/OVCBusqueda.aspx',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest',
    'sec-ch-ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Linux"',
}

COOKIES = {
    'cookieconsent_status': 'deny',
    'ASP.NET_SessionId': 'mwromsmq2roecoeaolr3w1oj',  # Esto puede caducar
    'Lenguaje': 'es',
    'VisorCartografico': 'ANTIGUO'
}

PROVINCIA_CODIGO = 30
PROVINCIA_NOMBRE = "Murcia"

def obtener_municipios():
    url = 'https://www1.sedecatastro.gob.es/CYCBienInmueble/OVCBusqueda.aspx/ObtenerMunicipios'
    data = {"filtro": "", "provincia": PROVINCIA_CODIGO}
    response = requests.post(url, headers=HEADERS, cookies=COOKIES, json=data)
    response.raise_for_status()
    return response.json()['d']

def obtener_vias(codigo_municipio):
    url = 'https://www1.sedecatastro.gob.es/CYCBienInmueble/OVCBusqueda.aspx/ObtenerVias'
    data = {"filtro": "", "provincia": PROVINCIA_CODIGO, "municipio": codigo_municipio}
    response = requests.post(url, headers=HEADERS, cookies=COOKIES, json=data)
    response.raise_for_status()
    return response.json().get('d', [])

def main():
    resultado = []
    municipios = obtener_municipios()

    for municipio in municipios:
        codigo_municipio = municipio['Codigo']
        nombre_municipio = municipio['Denominacion']

        print(f"Procesando municipio: {nombre_municipio} ({codigo_municipio})")

        try:
            vias = obtener_vias(codigo_municipio)
        except Exception as e:
            print(f"Error en municipio {nombre_municipio}: {e}")
            continue

        for via in vias:
            direccion_completa = f"{via.get('TipoVia', '')} {via.get('Denominacion', '')}, {nombre_municipio}, {PROVINCIA_NOMBRE}"
            resultado.append({
                "provincia": PROVINCIA_NOMBRE,
                "codigo_provincia": PROVINCIA_CODIGO,
                "municipio": nombre_municipio,
                "codigo_municipio": codigo_municipio,
                "tipo_via": via.get("TipoVia", ""),
                "sigla": via.get("Sigla", ""),
                "denominacion": via.get("Denominacion", ""),
                "direccion_completa": direccion_completa
            })

        time.sleep(0.5)

    with open('callejero.json', 'w', encoding='utf-8') as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)

    print(f"Exportadas {len(resultado)} vías en 'vias_murcia.json'.")

    # --- Segunda parte: solo Murcia capital ---
    # Leer el JSON y filtrar solo Murcia capital
    with open('callejero.json', 'r', encoding='utf-8') as f:
        todas_vias = json.load(f)

    vias_murcia_capital = [v for v in todas_vias if v['municipio'].upper() == 'MURCIA' and v['codigo_municipio'] == 30]

    df_murcia_capital = pd.DataFrame(vias_murcia_capital)
    df_murcia_capital.to_csv("vias-murcia.csv", index=False, encoding='utf-8-sig')

    print(f"Exportadas {len(vias_murcia_capital)} vías de Murcia capital en 'vias-murcia.csv'.")

if __name__ == '__main__':
    main()
