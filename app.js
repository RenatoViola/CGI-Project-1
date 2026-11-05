import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from './libs/utils.js';
import { vec2, flatten, radians, subtract, dot } from './libs/MV.js';

// Buffers: particles before update, particles after update, quad vertices
let inParticlesBuffer, outParticlesBuffer, quadBuffer;

// Particle system constants

// Total number of particles
const N_PARTICLES = 1000000;
const SCREENW = 1.5;
const MINLIFE_LOWERBOUND = 1;
const MINLIFE_UPPERBOUND = 19;
const MAXLIFE_LOWERBOUND = 2;
const MAXLIFE_UPPERBOUND = 20;
const BETA_LOWERBOUND = -180;
const BETA_UPPERBOUND = 180;

let screen_y;
let cursorPos;
let drawPoints = true;
let drawField = true;
let minLife = 2;
let maxLife = 10;
let minVelocity = 0.1;
let maxVelocity = 0.2;
let beta = [BETA_LOWERBOUND, BETA_UPPERBOUND];

let time = undefined;
let creatingPlanet = false;

const position = [];
const radius = [];

function main(shaders)
{
    // Generate the canvas element to fill the entire page
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    screen_y = canvas.height/canvas.width * 1.5;

    /** type {WebGL2RenderingContext} */
    const gl = setupWebGL(canvas, {alpha: true});

    // Initialize GLSL programs    
    const fieldProgram = buildProgramFromSources(gl, shaders["field-render.vert"], shaders["field-render.frag"]);
    const renderProgram = buildProgramFromSources(gl, shaders["particle-render.vert"], shaders["particle-render.frag"]);
    const updateProgram = buildProgramFromSources(gl, shaders["particle-update.vert"], shaders["particle-update.frag"], ["vPositionOut", "vAgeOut", "vLifeOut", "vVelocityOut"]);

    gl.viewport(0,0,canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Enable Alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); 

    buildQuad();
    buildParticleSystem(N_PARTICLES);

    window.addEventListener("resize", function(event) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        screen_y = canvas.height/canvas.width * 1.5;
        gl.viewport(0,0,canvas.width, canvas.height);
    });

    window.addEventListener("keydown", function(event) {
        console.log(event.key);
        switch(event.key) {
            case "PageUp":
                if(event.shiftKey){
                    if(minVelocity < maxVelocity)
                        minVelocity += 0.1;
                }else
                    maxVelocity += 0.1; 
                break;
            case "PageDown":
                if(event.shiftKey)
                    minVelocity -= 0.1;
                else{
                    if(maxVelocity > minVelocity) 
                        maxVelocity -= 0.1;
                }
                break;
            case "ArrowUp":
                if(beta[1] - beta[0] != 360){
                    beta[0] -= 2; 
                    beta[1] += 2;
                }
                break;
            case "ArrowDown":
                if(beta[1] - beta[0] >= 9){
                    beta[0] += 2; 
                    beta[1] -= 2;
                }
                break;
            case "ArrowLeft":
                beta[0] += 2; 
                beta[1] += 2;
                break;
            case "ArrowRight":
                beta[0] -= 2; 
                beta[1] -= 2;
                break;
            case 'q':
                if(minLife < MINLIFE_UPPERBOUND) minLife++;
                break;
            case 'a':
                if(minLife > MINLIFE_LOWERBOUND) minLife--;
                break;
            case 'w':
                if(maxLife < MAXLIFE_UPPERBOUND) maxLife++;
                break;
            case 's':
                if(maxLife > MAXLIFE_LOWERBOUND) maxLife--;
                break;
            case '0':
                drawField = !drawField;
                break;
            case '9':
                drawPoints  = !drawPoints;
                break; 
            case 'Shift':
                gl.useProgram(updateProgram);
                const origin = gl.getUniformLocation(updateProgram, "origin");
                gl.uniform2fv(origin, cursorPos);
                break;
        }
    })
    
    canvas.addEventListener("mousedown", function(event) {
        position.push(cursorPos);
        creatingPlanet = true;
    });

    canvas.addEventListener("mousemove", function(event) {
        cursorPos = getCursorPosition(canvas, event);
        if(creatingPlanet){
        const pIndex = position.length - 1;
        const planetCenter = position[pIndex];
        const dx = cursorPos[0] - planetCenter[0];
        const dy = cursorPos[1] - planetCenter[1];
        const r = Math.sqrt(dx * dx + dy * dy);
        radius[pIndex] = r;
        sendPlanetToShaders(pIndex);
        }
        console.log(vec2(cursorPos[0] * SCREENW, cursorPos[1] * screen_y));
    });

    canvas.addEventListener("mouseup", function(event) {
        creatingPlanet = false;
    })

    function getCursorPosition(canvas, event) {
        const mx = event.offsetX;
        const my = event.offsetY;

        const x = ((mx / canvas.width * 2) - 1);
        const y = (((canvas.height - my)/canvas.height * 2) - 1);

        return vec2(x,y);
    }

    window.requestAnimationFrame(animate);

    function buildQuad() {
        const vertices = [-1.5, 1.5, -1.5, -1.5, 1.5, -1.5,
                          -1.5, 1.5,  1.5, -1.5, 1.5,  1.5];
        
        quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    }

    function buildParticleSystem(nParticles) {
        const data = [];

        for(let i=0; i<nParticles; ++i) {
            // position
            data.push(Math.random() * 2 - 1); data.push(Math.random() * 2 - 1);
            
            // age
            data.push(0.0);

            // life
            const life = minLife + (maxLife - minLife) * Math.random();
            data.push(life);

            // velocity
            data.push(0.0);
            data.push(0.0);
        }

        inParticlesBuffer = gl.createBuffer();
        outParticlesBuffer = gl.createBuffer();

        // Input buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, inParticlesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(data), gl.STREAM_DRAW);

        // Output buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, outParticlesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(data), gl.STREAM_DRAW);
    }



    function animate(timestamp)
    {
        let deltaTime = 0;

        if(time === undefined) {        // First time
            time = timestamp/1000;
            deltaTime = 0;
        } 
        else {                          // All other times
            deltaTime = timestamp/1000 - time;
            time = timestamp/1000;
        }

        window.requestAnimationFrame(animate);

        // Clear framebuffer
        gl.clear(gl.COLOR_BUFFER_BIT);

        controlVariables();
        if(drawField) drawQuad();
        updateParticles(deltaTime);
        if(drawPoints) drawParticles(outParticlesBuffer, N_PARTICLES);
        swapParticlesBuffers();
    }

    function updateParticles(deltaTime)
    {
        // Setup uniforms
        const uDeltaTime = gl.getUniformLocation(updateProgram, "uDeltaTime");
        
        gl.useProgram(updateProgram);

        const uScale = gl.getUniformLocation(updateProgram, "uScale");
        gl.uniform2f(uScale, SCREENW, screen_y);

        gl.uniform1f(uDeltaTime, deltaTime);
        
        // Setup attributes
        const vPosition = gl.getAttribLocation(updateProgram, "vPosition");
        const vAge = gl.getAttribLocation(updateProgram, "vAge");
        const vLife = gl.getAttribLocation(updateProgram, "vLife");
        const vVelocity = gl.getAttribLocation(updateProgram, "vVelocity");

        gl.bindBuffer(gl.ARRAY_BUFFER, inParticlesBuffer);
        
        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 24, 0);
        gl.vertexAttribPointer(vAge, 1, gl.FLOAT, false, 24, 8);
        gl.vertexAttribPointer(vLife, 1, gl.FLOAT, false, 24, 12);
        gl.vertexAttribPointer(vVelocity, 2, gl.FLOAT, false, 24, 16);
        
        gl.enableVertexAttribArray(vPosition);
        gl.enableVertexAttribArray(vAge);
        gl.enableVertexAttribArray(vLife);
        gl.enableVertexAttribArray(vVelocity);

        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, outParticlesBuffer);
        gl.enable(gl.RASTERIZER_DISCARD);
        gl.beginTransformFeedback(gl.POINTS);
        gl.drawArrays(gl.POINTS, 0, N_PARTICLES);
        gl.endTransformFeedback();
        gl.disable(gl.RASTERIZER_DISCARD);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    }

    function swapParticlesBuffers()
    {
        let auxBuffer = inParticlesBuffer;
        inParticlesBuffer = outParticlesBuffer;
        outParticlesBuffer = auxBuffer;
    }

    function drawQuad() {

        gl.useProgram(fieldProgram);

        // Setup attributes
        const uScale = gl.getUniformLocation(fieldProgram, "uScale");
        gl.uniform2f(uScale, SCREENW, screen_y);

        const vPosition = gl.getAttribLocation(fieldProgram, "vPosition"); 

        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.enableVertexAttribArray(vPosition);
        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function drawParticles(buffer, nParticles)
    {

        gl.useProgram(renderProgram);

        // Setup attributes
        const vPosition = gl.getAttribLocation(renderProgram, "vPosition");

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 24, 0);
        gl.enableVertexAttribArray(vPosition);

        gl.drawArrays(gl.POINTS, 0, nParticles);
    }

    function controlVariables(){
        gl.useProgram(updateProgram);

        const minLifeP = gl.getUniformLocation(updateProgram, "minLife");
        gl.uniform1f(minLifeP, minLife);

        const maxLifeP = gl.getUniformLocation(updateProgram, "maxLife");
        gl.uniform1f(maxLifeP, maxLife);

        const minVelocityP = gl.getUniformLocation(updateProgram, "minVelocity");
        gl.uniform1f(minVelocityP, minVelocity);

        const maxVelocityP = gl.getUniformLocation(updateProgram, "maxVelocity");
        gl.uniform1f(maxVelocityP, maxVelocity);
        
        const betaP = gl.getUniformLocation(updateProgram, "beta");
        const betaInRadians = vec2(radians(beta[0]), radians(beta[1]));
        gl.uniform2fv(betaP, betaInRadians);
    }

    function sendPlanetToShaders(index){
        gl.useProgram(fieldProgram);
        // Get the location of the uniforms...
        const uPositionF = gl.getUniformLocation(fieldProgram, "uPosition[" + index + "]");
        const uRadiusF = gl.getUniformLocation(fieldProgram, "uRadius[" + index + "]");
        // Send the corresponding values to the GLSL program
        gl.uniform2fv(uPositionF, position[index]);
        gl.uniform1f(uRadiusF, radius[index]);  
        
        gl.useProgram(updateProgram);
        // Get the location of the uniforms...
        const uPositionP = gl.getUniformLocation(updateProgram, "uPosition[" + index + "]");
        const uRadiusP = gl.getUniformLocation(updateProgram, "uRadius[" + index + "]");
        // Send the corresponding values to the GLSL program
        gl.uniform2fv(uPositionP, position[index]);
        gl.uniform1f(uRadiusP, radius[index]);
    }

}

loadShadersFromURLS([
    "field-render.vert", "field-render.frag",
    "particle-update.vert", "particle-update.frag", 
    "particle-render.vert", "particle-render.frag"
    ]
).then(shaders=>main(shaders));