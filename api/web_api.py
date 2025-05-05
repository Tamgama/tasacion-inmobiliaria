from flask import Flask, request, jsonify
from catastro import normalizar_texto, obtener_inmuebles, filtrar, obtener_refcat_unida

app = Flask(__name__)

@app.route('/api/catastro/buscar', methods=['GET'])
def buscar_catastro():
    try:
        via = normalizar_texto(request.args.get('via'))
        numero = request.args.get('numero')
        sigla = request.args.get('sigla').upper()
        provincia = request.args.get('provincia', 'MURCIA').upper()
        municipio = request.args.get('municipio', 'MURCIA').upper()

        inmuebles = obtener_inmuebles(provincia, municipio, sigla, via, numero)

        for i in inmuebles:
            i['refcat'] = obtener_refcat_unida(i.get("rc"))

        return jsonify({"inmuebles": inmuebles})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/catastro/filtrar', methods=['POST'])
def filtrar_catastro():
    try:
        datos = request.json
        inmuebles = datos.get('inmuebles', [])
        bloque = datos.get('bloque')
        escalera = datos.get('escalera')
        planta = datos.get('planta')
        puerta = datos.get('puerta')

        filtrados = filtrar(inmuebles, bloque, escalera, planta, puerta)

        for f in filtrados:
            f["refcat"] = obtener_refcat_unida(f.get("rc"))

        return jsonify({"resultado": filtrados})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
