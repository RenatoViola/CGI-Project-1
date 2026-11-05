precision mediump float;

const int MAX_PLANETS=10;
const float PI = 3.1415926;
const float DENSITY = 5.51 * pow(10.0, 3.0);
const float GRAVITATIONAL_CONST = 6.67 * pow(10.0, -11.0);
const float DIST_FACTOR = 6.371 * pow(10.0, 6.0);

uniform vec2 uScale;
uniform float uRadius[MAX_PLANETS];
uniform vec2 uPosition[MAX_PLANETS];
uniform vec2 origin;
uniform float minLife;
uniform float maxLife;
uniform float minVelocity;
uniform float maxVelocity;
uniform vec2 beta;

/* Number of seconds (possibly fractional) that has passed since the last
   update step. */
uniform float uDeltaTime;

/* Inputs. These reflect the state of a single particle before the update. */


attribute vec2 vPosition;              // actual position
attribute float vAge;                  // actual age (in seconds)
attribute float vLife;                 // when it is supposed to dye 
attribute vec2 vVelocity;              // actual speed

/* Outputs. These mirror the inputs. These values will be captured into our transform feedback buffer! */
varying vec2 vPositionOut;
varying float vAgeOut;
varying float vLifeOut;
varying vec2 vVelocityOut;

// generates a pseudo random number that is a function of the argument. The argument needs to be constantly changing from call to call to generate different results
highp float rand(vec2 co)
{
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt= dot(co.xy ,vec2(a,b));
    highp float sn= mod(dt,3.14);
    return fract(sin(sn) * c);
}

vec2 velocity(){
   float angle = beta.x + (beta.y - beta.x) * rand(vec2(vPosition.x, vAge)) ;
   float speed = minVelocity + (maxVelocity - minVelocity) * rand(vec2(angle, tan(beta.y)));
   vec2 velocity = vec2(cos(angle), sin(angle)) * speed;
   return velocity / uScale;
}

vec2 netforce(){
   vec2 netforce = vec2(0.0, 0.0);
   for(int i = 0; i < MAX_PLANETS; i++){
        if(uRadius[i] != 0.0){
            float radius = uRadius[i] * DIST_FACTOR;
            float mass = 4.0 / 3.0 * PI * pow(radius, 3.0) * DENSITY;
            vec2 planetPos = uPosition[i] * uScale;
            vec2 particlePos = vPosition * uScale;
            float dist = distance(particlePos, planetPos) * DIST_FACTOR;
            vec2 directionalVector = normalize(planetPos - particlePos);
            if(dist < radius)
                mass = 4.0 / 3.0 * PI * pow(dist, 3.0) * DENSITY;
            else
                mass = 4.0 / 3.0 * PI * pow(radius, 3.0) * DENSITY;
            float intensity = GRAVITATIONAL_CONST * mass / pow(dist, 2.0);
            vec2 force = intensity * directionalVector;
            netforce += force;
        }
   }
   return netforce;
}

void main() {

   /* Update parameters according to our simple rules.*/
   vPositionOut = vPosition + vVelocity * uDeltaTime;
   vAgeOut = vAge + uDeltaTime;
   vLifeOut = vLife;

   vec2 accel = netforce() / uScale;
   vVelocityOut = vVelocity + accel * uDeltaTime;
      
   if (vAgeOut >= vLife) {
      // It's all up to you!
      vPositionOut = origin;
      vAgeOut = 0.0;
      vLifeOut = minLife + (maxLife - minLife) * rand(vec2(vPosition.y, vLife));
      vVelocityOut = velocity();
   }

}