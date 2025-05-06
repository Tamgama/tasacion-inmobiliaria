import requests
import json
import unicodedata
import re
import csv

def normalizar_texto(texto):
    texto = texto.upper()
    texto = unicodedata.normalize('NFKD', texto).encode('ASCII', 'ignore').decode('utf-8')
    texto = re.sub(r'[^A-Z0-9 ]', '', texto)
    return re.sub(r'\s+', ' ', texto).strip()

def consulta_dnp_loc(provincia, municipio, sigla, via, numero):
    via = normalizar_texto(via)
    url = (
        "https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json/"
        f"Consulta_DNPLOC?Provincia={provincia}&Municipio={municipio}&Sigla={sigla}&Calle={via}&Numero={numero}"
    )
    print(f"🌐 URL DNPLOC: {url}")
    headers = {"User-Agent": "CatastroScript/1.0"}
    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        raise Exception(f"Error {resp.status_code} en Consulta_DNPLOC")

    data = resp.json()
    # Primer intento: formato tradicional (bico.bi)
    bi = data.get("consulta_dnplocResult", {}).get("bico", {}).get("bi")
    if bi:
        if isinstance(bi, list):
            # Tomamos la primera referencia
            rc = bi[0].get("idbi", {}).get("rc", {})
        else:
            rc = bi.get("idbi", {}).get("rc", {})
        return rc.get("pc1", "") + rc.get("pc2", "")

    # Segundo intento: nuevo formato (lrcdnp.rcdnp)
    inmuebles = data.get("consulta_dnplocResult", {}).get("lrcdnp", {}).get("rcdnp", [])
    if inmuebles:
        rc = inmuebles[0].get("rc", {})
        return rc.get("pc1", "") + rc.get("pc2", "")

    return None

def consulta_dnprc(refcat_corta):
    url = (
        "https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json/"
        f"Consulta_DNPRC?RefCat={refcat_corta}"
    )
    print(f"🌐 URL DNPRC (corta): {url}")
    headers = {"User-Agent": "CatastroScript/1.0"}
    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        raise Exception(f"Error {resp.status_code} en Consulta_DNPRC")

    return resp.json()

def extraer_datos(data):
    inmuebles = data.get("consulta_dnprcResult", {}).get("lrcdnp", {}).get("rcdnp", [])
    resultados = []

    for inmueble in inmuebles:
        rc = inmueble.get("rc", {})
        dt = inmueble.get("dt", {})
        debi = inmueble.get("debi", {})
        loint = dt.get("locs", {}).get("lous", {}).get("lourb", {}).get("loint", {})
        dir_info = dt.get("locs", {}).get("lous", {}).get("lourb", {}).get("dir", {})

        resultados.append({
            "refcat": rc.get("pc1", "") + rc.get("pc2", "") + rc.get("car", "") + rc.get("cc1", "") + rc.get("cc2", ""),
            "tipo_via": dir_info.get("tv", ""),
            "nombre_via": dir_info.get("nv", ""),
            "numero": dir_info.get("pnp", ""),
            "bloque": loint.get("bq", ""),
            "escalera": loint.get("es", ""),
            "planta": loint.get("pt", ""),
            "puerta": loint.get("pu", ""),
            "cp": dir_info.get("dp", ""),
            "uso": debi.get("luso", ""),
            "superficie": debi.get("sfc", ""),
            "anio": debi.get("ant", "")
        })

    return resultados

def mostrar_resultados_legibles(inmuebles):
    if not inmuebles:
        print("❌ No se encontraron inmuebles.")
        return

    for item in inmuebles:
        print("📌 Dirección:")
        print(f"  {item['tipo_via']} {item['nombre_via']}, Nº {item['numero']}")
        print(f"  Bloque: {item['bloque']} | Escalera: {item['escalera']} | Planta: {item['planta']} | Puerta: {item['puerta']}")
        print(f"  Código Postal: {item['cp']}")
        print(f"🏠 Ref. Catastral: {item['refcat']}")
        print("📝 Datos del inmueble:")
        print(f"  Uso: {item['uso']}")
        print(f"  Superficie: {item['superficie']} m²")
        print(f"  Año construcción: {item['anio']}")
        print("-" * 60)

def exportar_json(inmuebles, nombre_archivo="inmuebles_catastro.json"):
    with open(nombre_archivo, "w", encoding="utf-8") as f:
        json.dump(inmuebles, f, ensure_ascii=False, indent=2)
    print(f"✅ Guardado en JSON: {nombre_archivo}")

def exportar_csv(inmuebles, nombre_archivo="inmuebles_catastro.csv"):
    campos = list(inmuebles[0].keys()) if inmuebles else []
    with open(nombre_archivo, mode="w", encoding="utf-8", newline='') as f:
        writer = csv.DictWriter(f, fieldnames=campos)
        writer.writeheader()
        writer.writerows(inmuebles)
    print(f"✅ Guardado en CSV: {nombre_archivo}")

import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--via", type=str, help="Nombre de la vía")
    parser.add_argument("--numero", type=str, help="Número")
    parser.add_argument("--sigla", type=str, help="Sigla de la vía")
    parser.add_argument("--refcat", type=str, help="Referencia catastral corta")
    args = parser.parse_args()

    if args.refcat:
        data = consulta_dnprc(args.refcat)
        inmuebles = extraer_datos(data)
        print(json.dumps(inmuebles, ensure_ascii=False))
    elif args.via and args.numero and args.sigla:
        refcat_corta = consulta_dnp_loc("MURCIA", "MURCIA", args.sigla, args.via, args.numero)
        if not refcat_corta:
            print(json.dumps([]))
        else:
            data = consulta_dnprc(refcat_corta)
            inmuebles = extraer_datos(data)
            print(json.dumps(inmuebles, ensure_ascii=False))
    else:
        print(json.dumps({"error": "Parámetros insuficientes"}))
