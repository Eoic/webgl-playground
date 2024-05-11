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

let scale = [1, 1];
let rotation = [0, 1];
let rotationDegrees = 0;
let color = [Math.random(), Math.random(), Math.random(), 1];
const translation = [100, 100];
const positions = [
    0, 0, 500, 0, 500, 500,
    0, 0, 0, 500, 500, 500,
];

const renderClosure = (
    context: WebGL2RenderingContext,
    program: WebGLProgram,
    uResolutionLoc: WebGLUniformLocation,
    uColorLoc: WebGLUniformLocation,
    uTranslationLoc: WebGLUniformLocation,
    uRotationLoc: WebGLUniformLocation,
    uScaleLoc: WebGLUniformLocation
) => {
    return () => {
        updateViewport(context);
        context.clearColor(0, 0, 0, 0);
        context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT);
        context.useProgram(program);
        context.uniform2f(uResolutionLoc, context.canvas.width, context.canvas.height);
        context.uniform4fv(uColorLoc, color);
        context.uniform2fv(uTranslationLoc, translation);
        context.uniform2fv(uRotationLoc, rotation);
        context.uniform2fv(uScaleLoc, scale);

        const count = 6;
        const offset = 0;
        const primitiveType = context.TRIANGLES;
        context.drawArrays(primitiveType, offset, count);
    }
}

const getRotationUnitVec = (degrees: number) => {
    const radians = degrees * Math.PI / 180;
    return [Math.sin(radians), Math.cos(radians)];
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
        const translationUniformLocation = context.getUniformLocation(program, 'u_translation');
        const rotationUniformLocation = context.getUniformLocation(program, 'u_rotation');
        const scaleUniformLocation = context.getUniformLocation(program, 'u_scale');
        const positionBuffer = context.createBuffer();

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

        context.vertexAttribPointer(positionAttribLocation, size, type, normalize, stride, offset);

        return renderClosure(
            context,
            program,
            resolutionUniformLocation!,
            colorUniformLocation!,
            translationUniformLocation!,
            rotationUniformLocation!,
            scaleUniformLocation!,
        );
    } catch (error) {
        console.error(error);
    }
}

const bindEvents = (render: () => void) => {
    const speed = 25;
    const rotationStep = 15;
    const scaleStep = 0.1;

    window.addEventListener('keypress', (event) => {
        switch (event.code) {
            case 'KeyA':
                translation[0] -= speed;
                break;
            case 'KeyD':
                translation[0] += speed;
                break;
            case 'KeyW':
                translation[1] -= speed;
                break;
            case 'KeyS':
                translation[1] += speed;
                break;
            case 'KeyQ':
                rotationDegrees += rotationStep;
                break;
            case 'KeyE':
                rotationDegrees -= rotationStep;
                break;
            case 'Space':
                color = [Math.random(), Math.random(), Math.random(), 1];
                break;
            case 'KeyX':
                if (event.shiftKey) scale[0] -= scaleStep;
                else scale[0] += scaleStep;
                break;
            case 'KeyY':
                if (event.shiftKey) scale[1] -= scaleStep;
                else scale[1] += scaleStep;
                break;
            default:
                return;
        }

        rotation = getRotationUnitVec(rotationDegrees);
        render();
    });
}

const render = main();

if (render) {
    render();
    bindEvents(render);
}