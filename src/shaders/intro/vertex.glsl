#version 300 es

in vec2 a_position;

uniform vec2 u_resolution;
uniform vec2 u_translation;
uniform vec2 u_rotation;
uniform vec2 u_scale;

void main() {
    vec2 scaled_position = a_position * u_scale;

    vec2 rotated_position = vec2(
        scaled_position.x * u_rotation.y + scaled_position.y * u_rotation.x,
        scaled_position.y * u_rotation.y - scaled_position.x * u_rotation.x
    );

    vec2 position = rotated_position + u_translation;
    vec2 zero_to_one = position / u_resolution;
    vec2 clip_space = zero_to_one * 2.0 - 1.0;
    gl_Position = vec4(clip_space * vec2(1, -1), 0, 1);
}