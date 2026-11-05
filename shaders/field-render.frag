precision highp float;

const int MAX_PLANETS=10;
const float PI = 3.1415926;
const float DENSITY = 5.51 * pow(10.0, 3.0);
const float GRAVITATIONAL_CONST = 6.67 * pow(10.0, -11.0);
const float DIST_FACTOR = 6.371 * pow(10.0, 6.0);

uniform float uRadius[MAX_PLANETS];
uniform vec2 uPosition[MAX_PLANETS];

varying vec2 f_Position;
varying vec2 scale;

vec2 netforce(){
   vec2 netforce = vec2(0.0, 0.0);
   for(int i = 0; i < MAX_PLANETS; i++){
        if(uRadius[i] != 0.0){
            float radius = uRadius[i] * DIST_FACTOR;
            vec2 planetPos = uPosition[i] * scale;
            float dist = distance(planetPos, f_Position) * DIST_FACTOR;
            vec2 directionalVector = normalize(planetPos - f_Position);
            float mass;
            if(dist < uRadius[i] * DIST_FACTOR)
                mass = 4.0 / 3.0 * PI * pow(dist, 3.0) * DENSITY;
            else
                mass = 4.0 / 3.0 * PI * pow(uRadius[i] * DIST_FACTOR, 3.0) * DENSITY;
    
            float intensity = GRAVITATIONAL_CONST * mass / pow(dist, 2.0);
            vec2 force = intensity * directionalVector;
            netforce += force;
        }
   }
   return netforce;
}

vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    vec2 net_force = netforce();
    float theta = atan(net_force.y, net_force.x) / (2.0 * PI);
    vec3 color = hsv2rgb(vec3(theta, 1.0, 1.0));
    float intensity = sqrt(pow(net_force.x,2.0) + pow(net_force.y,2.0));
    float opacity = mix(0.0, 1.0, intensity);
    float lines = mod(log(intensity), 0.4);
    if(lines < 0.06)
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    else
        gl_FragColor = vec4(color, opacity);
}