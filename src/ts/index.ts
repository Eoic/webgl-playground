import '../scss/styles.scss';

import { m3 } from './matrix';
const vertexShaderSource = require('../shaders/transformations/vertex.glsl');
const fragmentShaderSource = require('../shaders/transformations/fragment.glsl');

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
let rotationDegrees = 0;
let color = [Math.random(), Math.random(), Math.random(), 1];
const translation = [250, 250];
const positions = [
    0, 0, 500, 0, 500, 500,
    0, 0, 0, 500, 500, 500,
];

const computeTransform = (context: WebGL2RenderingContext): Array<number> => {
    let moveOriginMatrix = m3.translation(-250, -250);
    let projectionMatrix = m3.projection((context.canvas as HTMLCanvasElement).clientWidth, (context.canvas as HTMLCanvasElement).clientHeight);
    let translationMatrix = m3.translation(translation[0], translation[1]);
    let rotationMatrix = m3.rotation(rotationDegrees);
    let scalingMatrix = m3.scaling(scale[0], scale[1]);
    let matrix = m3.multiply(projectionMatrix, translationMatrix)
    matrix = m3.multiply(matrix, rotationMatrix);
    matrix = m3.multiply(matrix, scalingMatrix);
    matrix = m3.multiply(matrix, moveOriginMatrix);
    return matrix;
}

// let matrix = computeTransform();

const renderClosure = (
    context: WebGL2RenderingContext,
    program: WebGLProgram,
    uColorLoc: WebGLUniformLocation,
    uMatrixLoc: WebGLUniformLocation,
) => {
    return () => {
        const matrix = computeTransform(context);

        updateViewport(context);
        context.clearColor(0, 0, 0, 0);
        context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT);
        context.useProgram(program);
        context.uniform4fv(uColorLoc, color);
        context.uniformMatrix3fv(uMatrixLoc, false, matrix);

        const count = 6;
        const offset = 0;
        const primitiveType = context.TRIANGLES;
        context.drawArrays(primitiveType, offset, count);
    }
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
        const colorUniformLocation = context.getUniformLocation(program, 'u_color');
        const matrixUniformLocation = context.getUniformLocation(program, 'u_matrix');
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
            colorUniformLocation!,
            matrixUniformLocation!
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

        render();
    });
}

const render = main();

if (render) {
    render();
    bindEvents(render);
}