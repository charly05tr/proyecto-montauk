# 🎬 Proyecto Final Programación Gráfica: Montauk (Stranger Things)

Documento de diseño técnico para el recorrido virtual interactivo en *WebGL (Three.js). La arquitectura del software está estructurada meticulosamente para cumplir con los requisitos obligatorios de la rúbrica: **Modelos 3D, Texturas, Iluminación, Repositorio, Sonido, VFX e Interfaces*.

---

## 🏠 Escena 1: La Anomalía (Casa de Joyce Byers)

* *💡 El Concepto:* La icónica sala ochentera, cálida pero con una atmósfera de tensión estática. Un espacio cerrado diseñado para la exploración inicial y la interactividad del usuario.
* *🎮 Qué pasa:* El usuario inicializa la experiencia dentro de la sala. Puede orbitar la cámara libremente y observar detalles cotidianos optimizados (la TV de tubo, los sillones, revistas). La pared con el abecedario pintado destaca críticamente en el fondo.
* *🛠️ El Truco Técnico (*Iluminación, Interfaces, Modelos):* * Se implementa un teclado virtual superpuesto en la pantalla interactiva mediante un canvas híbrido (UI/Interfaz* en HTML/CSS/JS).
    * Se desarrolla un script en JavaScript que mapea las pulsaciones de teclas específicas a un arreglo indexado de luces dinámicas (PointLights en Three.js). El algoritmo valida que las luces solo se enciendan secuencialmente sobre las letras correctas correspondientes a la entrada de datos.
* *🔄 El Trigger / La Conexión:* El usuario debe ingresar la cadena exacta "H-E-L-P". Al completarse la validación, el hilo principal ejecuta un evento de apagón global de 1000ms. Al restablecerse el flujo de renderizado, una puerta lateral (previamente oculta mediante mallas condicionales) se abre, emitiendo un zumbido eléctrico de alta frecuencia (*Audio Posicional*) y una luz blanca cegadora de hospital. Cruzar este umbral ejecuta el ciclo de carga de la Escena 2.

---

## 🧪 Escena 2: La Infiltración (Pasillo del Laboratorio de Hawkins)

* *💡 El Concepto:* Un entorno estrictamente lineal, frío, metálico y claustrofóbico que genera un contraste visual y conceptual radical con la calidez orgánica de la casa de madera.
* *🎮 Qué pasa:* El usuario avanza de forma dirigida a lo largo de un pasillo industrial extendido. Las luminarias del techo sufren caídas de tensión constantes. Al fondo del corredor, una enorme grieta biológica integrada en la pared de metal palpita con una intensa emisión de luz roja.
* *🛠️ El Truco Técnico (*3D, VFX, Sonido):* * **Instanciación de Mallas:* Para optimizar la memoria de video (VRAM) y evitar el modelado manual de un pasillo kilométrico, se modela un único segmento modular de 5 metros en formato GLTF/GLB y se clona 10 veces programáticamente en bucle a través de la API de Three.js.
    * *Cálculo Aleatorio:* Un script matemático de fluctuación estocástica altera de forma aleatoria el parámetro de intensidad de los focos (SpotLights/PointLights) para simular el fallo eléctrico, sincronizado directamente con un buffer de audio posicional que reproduce un chispazo de alta tensión.
* *🔄 El Trigger / La Conexión:* La topología del pasillo obliga al usuario a avanzar vectorialmente hacia la grieta roja. Al colisionar con un radio de proximidad predefinido (Bounding Sphere), el diseño sonoro grave se vuelve ensordecedor y un evento programado en la cámara toma el control de los vectores de traslación, succionando la vista del usuario hacia el interior del nodo biológico e inicializando la Escena 3.

---

## 🌀 Escena 3: El Descenso (El Túnel Orgánico)

* *💡 El Concepto:* La transición visceral e interdimensional en tiempo real. Representa la navegación física a través de las venas subterráneas que conectan ambas dimensiones.
* *🎮 Qué pasa:* La cámara del usuario experimenta una caída libre simulada a gran velocidad a través de un conducto cilíndrico recubierto de raíces y enredaderas palpitantes, sufriendo una transición cromática de la iluminación roja del laboratorio a una paleta azul oscura y tóxica.
* *🛠️ El Truco Técnico (*Texturas, Iluminación):* * **Cero Movimiento en el Eje Z:* Para mitigar el costo computacional de grandes transformaciones de matrices de traslación, la cámara se mantiene estática en sus coordenadas físicas del eje Z. 
    * *Desplazamiento UV (Texture Scrolling):* Se genera un cilindro matemático (TubeGeometry) al que se le aplica una textura orgánica de alta resolución. El truco gráfico consiste en actualizar programáticamente en el bucle de renderizado (requestAnimationFrame) el offset de las coordenadas UV de la textura hacia atrás. Esta ilusión óptica simula perfectamente un desplazamiento a 100 km/h sin alterar la posición real de los objetos.
* *🔄 El Trigger / La Conexión:* Tras un contador preciso de 5000ms de caída controlada, el material del cilindro ejecuta un fundido hacia el negro absoluto, se activa un sonido de impacto sordo de baja frecuencia (LFE) y la cámara modifica instantáneamente su matriz de transformación para aterrizar en el suelo de la Escena 4.

---

## 🌈 Escena 4: El Origen (La "Rainbow Room" - Upside Down)

* *💡 El Concepto:* El cuarto de juegos y experimentación de Once, pero consumido por completo por el entorno hostil del "Mundo del Revés", cerrando el arco narrativo y demostrando el impacto destructivo de la dimensión alterna.
* *🎮 Qué pasa:* El usuario explora los escombros de la habitación de pruebas. El arcoíris icónico pintado en la pared se encuentra decolorado y colonizado por moho biológico; en el epicentro geométrico de la habitación yace el tanque de privación sensorial completamente destruido.
* *🛠️ El Truco Técnico (*Texturas, VFX):* * **Sistema de Partículas (VFX Opcional):* Se implementa un motor de partículas optimizado utilizando PointsMaterial. Se instancian miles de vértices flotando lentamente mediante cálculos de ruido matemático para simular esporas volumétricas en suspensión en el aire.
    * *Post-procesamiento de Fragmentos:* Se inyecta un shader de post-procesamiento en la cola de renderizado para aplicar un filtro de viñeteado y una corrección de color fría/gélida en toda la pantalla, consolidando la atmósfera tétrica sin añadir geometría adicional.
* *🔄 El Trigger / La Conexión:* Al aproximarse a la malla del tanque central, la composición musical alcanza su clímax de ganancia. Se ejecuta una función de interpolación para realizar un Fade to Black (fundido a negro suave) y se renderiza en la capa HTML una interfaz final interactiva que despliega el logotipo del equipo, la *Licencia MIT* de código abierto y los créditos técnicos correspondientes.

---
