import '../scss/styles.scss';
const vertexShaderSource = require('../shaders/intro/vertex.glsl');
const fragmentShaderSource = require('../shaders/intro/fragment.glsl');

const resizeCanvasToDisplaySize = (canvas: HTMLCanvasElement): boolean => {
    // Lookup the size the browser is displaying the canvas in CSS pixels.
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    // Check if the canvas is not the same size.
    const isResizeNeeded = canvas.width !== displayWidth || canvas.height !== displayHeight;

    if (isResizeNeeded) {
        // Make the canvas the same size.
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }

    return isResizeNeeded;
}

const createShader = (context: WebGL2RenderingContext, type: number, source: string): WebGLShader => {
    const shader = context.createShader(type);

    if (!shader)
        throw new Error(`Could not create shader of type: ${type}.`);

    context.shaderSource(shader, source);
    context.compileShader(shader);

    if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
        console.error(context.getShaderInfoLog(shader));
        context.deleteShader(shader);
    }

    return shader;
}

const createProgram = (context: WebGL2RenderingContext, ...shaders: WebGLShader[]): WebGLProgram => {
    const program = context.createProgram();

    if (!program)
        throw new Error(`Could not create program!`);

    shaders.forEach((shader) => context.attachShader(program, shader));
    context.linkProgram(program);

    if (!context.getProgramParameter(program, context.LINK_STATUS)) {
        const log = context.getProgramInfoLog(program);
        context.deleteProgram(program);
        throw new Error(`Failed to link program: ${log}.`);
    }

    return program;
}

const updateViewport = (context: WebGL2RenderingContext) => {
    resizeCanvasToDisplaySize(context.canvas as HTMLCanvasElement);
    context.viewport(0, 0, context.canvas.width, context.canvas.height);
}

const main = () => {
    const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;

    if (!canvas) {
        console.error('Could not find canvas element!');
        return;
    }

    const context = canvas.getContext('webgl2');

    if (!context) {
        console.error('Could not get WebGL2 context!');
        return;
    }

    try {
        const vertexShader = createShader(context, context.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(context, context.FRAGMENT_SHADER, fragmentShaderSource);
        const program = createProgram(context, vertexShader, fragmentShader);

        const positionAttribLocation = context.getAttribLocation(program, 'a_position');
        const resolutionUniformLocation = context.getUniformLocation(program, 'u_resolution');
        const colorUniformLocation = context.getUniformLocation(program, 'u_color');
        const positionBuffer = context.createBuffer();
        const positions = [
            0, 0,       // T1: x0, y0
            500, 0,     // T1: x1, y1
            500, 500,   // T1: x2, y2 
            0, 0,
            0, 500,
            500, 500,
        ];

        context.bindBuffer(context.ARRAY_BUFFER, positionBuffer);
        context.bufferData(context.ARRAY_BUFFER, new Float32Array(positions), context.STATIC_DRAW);

        const vao = context.createVertexArray();

        context.bindVertexArray(vao);
        context.enableVertexAttribArray(positionAttribLocation);

        const size = 2;                 // Only x and y components.
        const type = context.FLOAT;     // 32-bit floats.
        const normalize = false;        // No data normalization.
        const stride = 0;               // Move forward by `size * sizeof(type)` to get the next position.
        const offset = 0;               // Start at the beginning of the buffer.

        updateViewport(context);

        context.vertexAttribPointer(positionAttribLocation, size, type, normalize, stride, offset);
        context.clearColor(0, 0, 0, 0);
        context.clear(context.COLOR_BUFFER_BIT);
        context.useProgram(program);
        context.bindVertexArray(vao);
        context.uniform2f(resolutionUniformLocation, context.canvas.width, context.canvas.height);
        context.uniform4f(colorUniformLocation, Math.random(), Math.random(), Math.random(), 1);

        const count = 6;
        const arr_offset = 0;
        const primitiveType = context.TRIANGLES;
        context.drawArrays(primitiveType, arr_offset, count);
    } catch (error) {
        console.error(error);
    }
}

main();