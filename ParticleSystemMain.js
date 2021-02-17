/*******************************************************************
* File: ParticleSystemMain.js
* Author: Aniket Dashpute
* Credits:
* Most of the code is starter code
* by Prof. Jack Tumblin, Northwestern University
* Incorporated some of the coding style from:
* https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial
*******************************************************************/

function main()
{
    // Initialize and get GL context
    gl = getGlContext();

    // create the event handler object
    eventHandler = new EventHandler();

    // initialize mouse and keyboard click events
    initializeEventListeners();

    // TO DO: temp arrangement
    // initialize miscellaneous global variables
    initializeMisc();

    // initialize the shaders and create program
    initializeShaders(gl);
    
    // Look up all the attributes and uniforms our shader program is using
    // and store them in programInfo to be used directly later
    programInfo = getAtrribsAndUniforms(gl);

    // Initialize the buffers that we will need for drawing cube
    buffersCube = initBuffersCube(gl);
    buffersCube2 = initBuffersCube2(gl);

    // Initialize the buffers that will make a plane
    buffersPlane = initBuffersPlane(gl);

    // Initialize the buffers that we will need for drawing ground
    buffersGround = initBuffersGround(gl);

    // Init Camera
    initCameraParams();

    // Our first global particle system object
    // contains 'state variables' s1,s2;
    // for code, see PartSys.js
    // create our first particle-system object
    // Bouncy Balls
    g_partA = new PartSys();

    // create thrid particle-system object
    // Reeves Fire
    g_partC = new PartSys();

    // create fourth particle-system object
    // Tornado
    g_partD = new PartSys();

    // create fifth particle-system object
    // Boids
    g_partE = new PartSys();

    // create sixth particle-system object
    // Falling Particles
    g_partF = new PartSys();

    // create seventh particle-system object
    // Cloth
    g_partG = new PartSys();

    // Initialize Particle systems:
    
    // create a 2D bouncy-ball system where
    // 2 particles bounce within -0.9 <=x,y<0.9 and z=0.
    g_partA.initBouncy2D(200);

    // create a Reeves Fire
    g_partC.initReevesFire(150);

    // create Tornado
    g_partD.initTornado(200);

    // create Boids
    g_partE.initBoids(100);

    // create particles falling on plane
    g_partF.initFallingParts(50);

    // create Cloth
    g_partG.initCloth(4, 4);

    // recursively call tick() using requestAnimationFrame
    var tick = function ()
    {
        // get time elapsed since last animate() call
		g_timeStep = animate();
		// if it took more than 200 ms (due to any reason), reduce the timestep
		if (g_timeStep > 200) { g_timeStep = 1000 / 60; }
        
        // Draw the cube and ground
        drawScene(gl, programInfo);
        
		requestAnimationFrame(tick);
	};
	tick();
}

function initializeMisc()
{
    // time when animate() was last called
    g_last = Date.now();
    // current timestep in milliseconds (init to 1/60th sec) 
    g_timeStep = 1000.0 / 60.0;

    // angle of rotation (for tilt left-right)
    thetaChange = Math.PI/60;
    // distance to move on key press
    distChange = 0.5;

    // default state is play state, will pause only on user input
    bIsPaused = false;

    // Initialize tornado position
    tornado_x = 0;
    tornado_y = 0;
}

function initCameraParams()
{
    // The position of the eye point
    eyeX = 0.0, eyeY = -10.0, eyeZ = 3.0;
    // The position of the reference point
    centerX = 0.0, centerY = 0.0, centerZ = 3.0;
    // 'up' vector
    upX = 0.0, upY = 0.0, upZ = 1.0;

    // Initialize direction vectors
    eventHandler.calcDirectionVectors();

    // TO DO: temp arrangement, need to move code later
    // initialize current rotation angle of cube
    currentAngle = 0;
}

/*
* Returns how much time (in ms)
* passed since the last call to this fcn.
*/
function animate()
{
    // get current time
    var now = Date.now();
    // amount of time passed, in integer milliseconds
    var elapsed = now - g_last;
    // re-set our stopwatch/timer.
	g_last = now;

    if (true == bIsPaused)
    {
        elapsed = 0;
    }

	return elapsed;
}

function getGlContext()
{
    // Get the canvas element to draw using WebGL
    const canvas = document.getElementById("glCanvas");

    // Initialize GL context
    const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
    // Only continue if WebGL is available and working
    if (!gl)
    {
        console.log("main() Failed to get rendering context for WebGL");
        return;
    }

    return gl;
}

function initializeShaders(gl)
{
    // get the vertex and fragment shader strings
    var vsSource = document.getElementById("vertex-shader").textContent;
    var fsSource = document.getElementById("fragment-shader").textContent;
    // Initialize shaders and set the program with VS and FS source as given in input
    if (!initShaders(gl, vsSource, fsSource))
    {
		console.log('main() Failed to intialize shaders.');
		return;
    }
}

function getAtrribsAndUniforms(gl)
{
    const programInfo =
    {
        program: gl.program,
        attribLocations:
        {
          vertexPosition: gl.getAttribLocation(gl.program, 'a_Position'),
          vertexColor: gl.getAttribLocation(gl.program, 'a_Color'),
        },
        uniformLocations:
        {
            projectionMatrix: gl.getUniformLocation(gl.program, 'u_ProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(gl.program, 'u_ModelViewMatrix'),
        }
    };

    return programInfo;
}

function setVertexInputLayout(gl, buffers, programInfo)
{
    // Vertices ->

    // Bind the buffer object to target (gl.ARRAY_BUFFER = vertexBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertex);
 
    if (programInfo.attribLocations.vertexPosition < 0)
    {
        console.log('Failed to get the storage location of a_Position');
        return -1;
    }    
    // # of values in this attrib, ex: (x,y,z) => 3
    var nAttributes = buffers.numVertexAttributes;
    // data type (usually gl.FLOAT)
    var dataType = gl.FLOAT;
    // use integer normalizing? (usually false)
    var bNormalize = false;
    // Stride: #bytes from 1st stored value to next 
    var stride = 0;
    // Offiset; #bytes from start of buffer to the 1st attrib value to be used
    var offset = 0;

    // specify the layout of the vertex buffer
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition, 
        nAttributes,
        dataType, 
        bNormalize,
        stride,
        offset);                                       
                                
    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    // Colors ->

    // Bind the buffer object to target (gl.ARRAY_BUFFER = colorBuffer)    
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    
    if (programInfo.attribLocations.vertexColor < 0)
    {
        console.log('Failed to get the storage location of a_Color');
        return -1;
    }    
    // # of values in this attrib, ex: (r,g,b,w) => 4
    nAttributes = buffers.numColorAttributes;
    dataType = gl.FLOAT;
    bNormalize = false;
    stride = 0;
    offset = 0;

    // specify the layout of the vertex buffer       
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexColor,
        nAttributes,
        dataType,
        bNormalize,
        stride,
        offset);

    // Enable the assignment to a_Color variable
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

    // Indices ->

    // Tell WebGL which indices to use to index the vertices
    // will be null if no index buffer exists
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
}

function setProjectionMatrix(gl, programInfo)
{
    // create and set the perspective matrix

    // FOVY: top-to-bottom vertical image angle, in degrees
    const fieldOfView = 45;
    // Image Aspect Ratio
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    // camera z-near distance (always positive; frustum begins at z = -znear)
    const zNear = 0.1;
    // camera z-far distance (always positive; frustum ends at z = -zfar)
    const zFar = 1000.0;

    projectionMatrix = new Matrix4();
    projectionMatrix.setIdentity();

    projectionMatrix.perspective(
        fieldOfView,
        aspect,
        zNear,
        zFar);

    // In this coord system, our up vector is z-axis
    // Initially, our viewing angle is such that the screen is x-z plane
    // and inside screen is +y-axis

    projectionMatrix.lookAt(
        eyeX, eyeY, eyeZ,
        centerX, centerY, centerZ,
        upX, upY, upZ);

    // Pass our current matrix to the vertex shader
	gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix.elements);
}

function setModelViewMatrixCube(gl, programInfo, currentAngle)
{
    // create and set the model view matrix

    // our viewing angle is such that the screen is x-z plane
    // and inside screen is +y-axis

    var modelViewMatrix = new Matrix4();
    
    modelViewMatrix.setIdentity();
    // translate cube
    modelViewMatrix.translate(0.0, 70.0, 40.0);
    // scale cube
    var s = 2.0;
    modelViewMatrix.scale(s, s, s);

    // Pass our current matrix to the vertex shaders:
	gl.uniformMatrix4fv(
        this.programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix.elements);
}

function setModelViewMatrixCube2(gl, programInfo, currentAngle)
{
    // create and set the model view matrix

    var modelViewMatrix = new Matrix4();
    
    modelViewMatrix.setIdentity();


    // scale system
    var s = 2.0;
    modelViewMatrix.scale(s, s, s);
    // translate cube to required position
    //modelViewMatrix.translate(1.0, 1.0, 1.0);

    // apply the Bouncy ball transformations:
    // translate system
    modelViewMatrix.translate(0.0, 2.5, 0.0);

    modelViewMatrix.translate(1.0, 1.5, 1.5);
    // scale cube
    var s = 0.5;
    modelViewMatrix.scale(1.0, s, s);

    // Pass our current matrix to the vertex shaders:
	gl.uniformMatrix4fv(
        this.programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix.elements);
}

function setModelViewMatrixPlane(gl, programInfo)
{
    // create and set the model view matrix

    // our viewing angle is such that the screen is x-z plane
    // and inside screen is +y-axis

    var modelViewMatrix = new Matrix4();
    
    modelViewMatrix.setIdentity();
    // translate cube
    modelViewMatrix.translate(-40.0, 40.0, 10.0);
    // scale cube
    var s = 1.0;
    modelViewMatrix.scale(s, s, s);

    // Pass our current matrix to the vertex shaders:
	gl.uniformMatrix4fv(
        this.programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix.elements);
}

function setModelViewMatrixGround(gl, programInfo, currentAngle)
{
    var modelViewMatrix = new Matrix4();
    
    modelViewMatrix.setIdentity();

    // Pass our current matrix to the vertex shaders:
	gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix.elements);    
}

function makeGround()
{
    // make a ground grid in x-y plane
    
    // create array of vertex positions
    // GL_LINES primitive would be used to draw this

    // (x, y, z, w) structure of vertices
    var numAttribs = 4;

    // # lines to draw in x,y to make the grid
    var nXLines = 100;
    var nYLines = 100;

    // grid size; extends to cover +/-xymax in x and y
    var xymax = 50.0;

    // total # vertices
    var nVertices = 2 * (nXLines + nYLines);

    // half-spacing between lines in x,y
    // because v * xgap => v is (line #)/2
	var xgap = xymax / (nXLines - 1);
    var ygap = xymax / (nYLines - 1);
        
    // create an array of vertices, 2 vertices for each line
    var verticesGround = new Float32Array(numAttribs * 2 * (nXLines + nYLines));

    // vertices for Y-lines (parallel to y-axis)
    for (v = 0, j = 0; v < 2 * nYLines; v++, j += numAttribs)
    {
        // put even-numbered vertices at (xnow, -xymax, 0)
        if (v % 2 == 0)
        {
            // x, y, z, w
			verticesGround[j] = -xymax + (v) * ygap;
			verticesGround[j + 1] = -xymax;
			verticesGround[j + 2] = 0.0;
			verticesGround[j + 3] = 1.0;
        }
        // put odd-numbered vertices at (xnow, +xymax, 0).
        else
        {
            // x, y, z, w
			verticesGround[j] = -xymax + (v - 1) * ygap;
			verticesGround[j + 1] = xymax;
			verticesGround[j + 2] = 0.0;
			verticesGround[j + 3] = 1.0;
		}
    }
    
    // vertices for X-lines (parallel to x-axis)
    for (v = 0; v < 2 * nXLines; v++, j += numAttribs)
    {
        // put even-numbered vertices at (-xymax, ynow, 0)
        if (v % 2 == 0)
        {
            // x, y, z, w
			verticesGround[j] = -xymax;
			verticesGround[j + 1] = -xymax + (v) * xgap;
			verticesGround[j + 2] = 0.0;
			verticesGround[j + 3] = 1.0;
        }
        // put odd-numbered vertices at (xnow, +xymax, 0).
        else
        {
            // x, y, z, w
			verticesGround[j] = xymax;
			verticesGround[j + 1] = -xymax + (v - 1) * xgap;
			verticesGround[j + 2] = 0.0;
			verticesGround[j + 3] = 1.0;
		}
    }


    // create and fill color array for the x-y lines
    
    // green color for Y-lines
    var cColor1 = [0.3, 0.3, 0.3, 1.0];

    // yellow color for X-lines
    var cColor2 = [0.25, 0.25, 0.25, 1.0];

    // (r,g,b,a)
    numAttribs = 4;
    var colorsGround = new Float32Array(numAttribs * 2 * (nXLines + nYLines));

    // colors for Y-lines (parallel to y-axis)
    for (v = 0, j = 0; v < 2 * nYLines; v++, j += numAttribs)
    {
        colorsGround[j] = cColor1[0];
        colorsGround[j + 1] = cColor1[1];
        colorsGround[j + 2] = cColor1[2];
        colorsGround[j + 3] = cColor1[3];
    }

    // colors for X-lines (parallel to x-axis)
    for (v = 0; v < 2 * nXLines; v++, j += numAttribs)
    {
        colorsGround[j] = cColor2[0];
        colorsGround[j + 1] = cColor2[1];
        colorsGround[j + 2] = cColor2[2];
        colorsGround[j + 3] = cColor2[3];
    }


    return {
        vertices: verticesGround,
        colors: colorsGround,
        numVertices: nVertices,
    }

}

function makeCube()
{
    // array of vertex positions collection of (x,y,z)'s
    const f = 0.5;
    var vertices = new Float32Array ([
        // Front face
        -f, -f,  f,
        f, -f,  f,
        f,  f,  f,
        -f,  f,  f,

        // Back face
        -f, -f, -f,
        -f,  f, -f,
        f,  f, -f,
        f, -f, -f,

        // Top face
        -f,  f, -f,
        -f,  f,  f,
        f,  f,  f,
        f,  f, -f,

        // Bottom face
        -f, -f, -f,
        f, -f, -f,
        f, -f,  f,
        -f, -f,  f,

        // Right face
        f, -f, -f,
        f,  f, -f,
        f,  f,  f,
        f, -f,  f,

        // Left face
        -f, -f, -f,
        -f, -f,  f,
        -f,  f,  f,
        -f,  f, -f,
    ]);

    var indices = new Uint16Array ([
        0,  1,  2,      0,  2,  3,    // front
        4,  5,  6,      4,  6,  7,    // back
        8,  9,  10,     8,  10, 11,   // top
        12, 13, 14,     12, 14, 15,   // bottom
        16, 17, 18,     16, 18, 19,   // right
        20, 21, 22,     20, 22, 23,   // left
    ]);

    var faceColors = [
        [1.0,  1.0,  1.0,  1.0],    // Front face: white
        [1.0,  0.0,  0.0,  1.0],    // Back face: red
        [0.0,  1.0,  0.0,  1.0],    // Top face: green
        [0.0,  0.0,  1.0,  1.0],    // Bottom face: blue
        [1.0,  1.0,  0.0,  1.0],    // Right face: yellow
        [1.0,  0.0,  1.0,  1.0],    // Left face: purple
    ];

    // Convert the array of colors into a table for all the vertices.
    var colorArray = [];
    for (var j = 0; j < faceColors.length; ++j)
    {
        const c = faceColors[j];

        // Repeat each color four times for the four vertices of the face
        colorArray = colorArray.concat(c, c, c, c);
    }
    colors = new Float32Array (colorArray);
    
    // # vertices to be draw in total (count of indices)
    var nVertices = 36;

    return {
        vertices: vertices,
        colors: colors,
        indices: indices,
        numVertices: nVertices,
    };
}

function makeCube2()
{
    // array of vertex positions collection of (x,y,z)'s
    const f = 1.0;
    var vertices = new Float32Array ([
        // Front face
        -f, -f,  f,
        f, -f,  f,
        f,  f,  f,
        -f,  f,  f,

        // Back face
        -f, -f, -f,
        -f,  f, -f,
        f,  f, -f,
        f, -f, -f,

        // Top face
        -f,  f, -f,
        -f,  f,  f,
        f,  f,  f,
        f,  f, -f,

        // Bottom face
        -f, -f, -f,
        f, -f, -f,
        f, -f,  f,
        -f, -f,  f,

        // Right face
        f, -f, -f,
        f,  f, -f,
        f,  f,  f,
        f, -f,  f,

        // Left face
        -f, -f, -f,
        -f, -f,  f,
        -f,  f,  f,
        -f,  f, -f,
    ]);

    var indices = new Uint16Array ([
        0,  1,  2,      0,  2,  3,    // front
        4,  5,  6,      4,  6,  7,    // back
        8,  9,  10,     8,  10, 11,   // top
        12, 13, 14,     12, 14, 15,   // bottom
        16, 17, 18,     16, 18, 19,   // right
        20, 21, 22,     20, 22, 23,   // left
    ]);

    var faceColors = [
        [1.0,  1.0,  1.0,  1.0],    // face: white
    ];

    // Convert the array of colors into a table for all the vertices.
    var colorArray = [];
    for (var j = 0; j < 6*faceColors.length; ++j)
    {
        const c = faceColors[j];

        // Repeat each color four times for the four vertices of the face
        colorArray = colorArray.concat(c, c, c, c);
    }
    colors = new Float32Array (colorArray);
    
    // # vertices to be draw in total (count of indices)
    var nVertices = 36;

    return {
        vertices: vertices,
        colors: colors,
        indices: indices,
        numVertices: nVertices,
    };
}

function makePlane()
{
    // array of vertex positions collection of (x,y,z)'s
    const f = 7.0;
    const fz = -0.25;
    var vertices = new Float32Array ([
        // Front face
        -f,  -f,   fz,
         f,  -f,   fz,
         f,   f,   fz,
        -f,   f,   fz,
    ]);

    var indices = new Uint16Array ([
        0,  1,  2,      0,  2,  3,    // front
    ]);

    var faceColors = [
        [0.73, 0.31, 0.1, 1.0],    // Front face: white
    ];

    // Convert the array of colors into a table for all the vertices.
    var colorArray = [];
    for (var j = 0; j < faceColors.length; ++j)
    {
        const c = faceColors[j];

        // Repeat each color four times for the four vertices of the face
        colorArray = colorArray.concat(c, c, c, c);
    }
    colors = new Float32Array (colorArray);
    
    // # vertices to be draw in total (count of indices)
    var nVertices = 6;

    return {
        vertices: vertices,
        colors: colors,
        indices: indices,
        numVertices: nVertices,
    };
}

function initBuffersCube(gl)
{
    // get the data of vertices, indices and color for a cube
    cubeParams = makeCube();

    // (x, y, z)
    nVertexAttributes = 3;
    // Create a buffer object for vertices
    var vertexBuffer = gl.createBuffer();
    if (!vertexBuffer)
    {
        console.log('Failed to create the vertex buffer object');
        return -1;
    }
    // Bind the buffer object to target (gl.ARRAY_BUFFER = vertexBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    // Write data into the buffer object (vertexBuffer.data = vertices)
    gl.bufferData(gl.ARRAY_BUFFER, cubeParams.vertices, gl.STATIC_DRAW);

    // Create Buffer, Bind to Index Buffer, Write Data
    var indexBuffer = gl.createBuffer();
    if (!indexBuffer)
    {
        console.log('Failed to create the index buffer object');
        return -1;
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cubeParams.indices, gl.STATIC_DRAW);

    // (r, g, b, a)
    nColorAttributes = 4;
    // Create Buffer, Bind to Color Buffer, Write Data
    var colorBuffer = gl.createBuffer();
    if (!colorBuffer)
    {
        console.log('Failed to create the color buffer object');
        return -1;
    }    
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeParams.colors, gl.STATIC_DRAW);

    return {
        vertex: vertexBuffer,
        vertexCount: cubeParams.numVertices,
        numVertexAttributes: nVertexAttributes,
        index: indexBuffer,
        color: colorBuffer,
        numColorAttributes: nColorAttributes,
    };
}

function initBuffersCube2(gl)
{
    // get the data of vertices, indices and color for a cube
    cubeParams = makeCube2();

    // (x, y, z)
    nVertexAttributes = 3;
    // Create a buffer object for vertices
    var vertexBuffer = gl.createBuffer();
    if (!vertexBuffer)
    {
        console.log('Failed to create the vertex buffer object');
        return -1;
    }
    // Bind the buffer object to target (gl.ARRAY_BUFFER = vertexBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    // Write data into the buffer object (vertexBuffer.data = vertices)
    gl.bufferData(gl.ARRAY_BUFFER, cubeParams.vertices, gl.STATIC_DRAW);

    // Create Buffer, Bind to Index Buffer, Write Data
    var indexBuffer = gl.createBuffer();
    if (!indexBuffer)
    {
        console.log('Failed to create the index buffer object');
        return -1;
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cubeParams.indices, gl.STATIC_DRAW);

    // (r, g, b, a)
    nColorAttributes = 4;
    // Create Buffer, Bind to Color Buffer, Write Data
    var colorBuffer = gl.createBuffer();
    if (!colorBuffer)
    {
        console.log('Failed to create the color buffer object');
        return -1;
    }    
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeParams.colors, gl.STATIC_DRAW);

    return {
        vertex: vertexBuffer,
        vertexCount: cubeParams.numVertices,
        numVertexAttributes: nVertexAttributes,
        index: indexBuffer,
        color: colorBuffer,
        numColorAttributes: nColorAttributes,
    };
}

function initBuffersPlane(gl)
{
    // get the data of vertices, indices and color for a cube
    planeParams = makePlane();

    // (x, y, z)
    nVertexAttributes = 3;
    // Create a buffer object for vertices
    var vertexBuffer = gl.createBuffer();
    if (!vertexBuffer)
    {
        console.log('Failed to create the vertex buffer object');
        return -1;
    }
    // Bind the buffer object to target (gl.ARRAY_BUFFER = vertexBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    // Write data into the buffer object (vertexBuffer.data = vertices)
    gl.bufferData(gl.ARRAY_BUFFER, planeParams.vertices, gl.STATIC_DRAW);

    // Create Buffer, Bind to Index Buffer, Write Data
    var indexBuffer = gl.createBuffer();
    if (!indexBuffer)
    {
        console.log('Failed to create the index buffer object');
        return -1;
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, planeParams.indices, gl.STATIC_DRAW);

    // (r, g, b, a)
    nColorAttributes = 4;
    // Create Buffer, Bind to Color Buffer, Write Data
    var colorBuffer = gl.createBuffer();
    if (!colorBuffer)
    {
        console.log('Failed to create the color buffer object');
        return -1;
    }    
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, planeParams.colors, gl.STATIC_DRAW);

    return {
        vertex: vertexBuffer,
        vertexCount: planeParams.numVertices,
        numVertexAttributes: nVertexAttributes,
        index: indexBuffer,
        color: colorBuffer,
        numColorAttributes: nColorAttributes,
    };
}

function initBuffersGround(gl)
{
    // get the data of vertices, indices and color for a cube
    groundParams = makeGround();

    // (x, y, z, w)
    nVertexAttributes = 4;
    // Create a buffer object for vertices
    var vertexBuffer = gl.createBuffer();
    if (!vertexBuffer)
    {
        console.log('Failed to create the vertex buffer object');
        return -1;
    }
    // Bind the buffer object to target (gl.ARRAY_BUFFER = vertexBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    // Write data into the buffer object (vertexBuffer.data = vertices)
    gl.bufferData(gl.ARRAY_BUFFER, groundParams.vertices, gl.STATIC_DRAW);

    // (r, g, b, a)
    nColorAttributes = 4;
    // Create Buffer, Bind to Color Buffer, Write Data
    var colorBuffer = gl.createBuffer();
    if (!colorBuffer)
    {
        console.log('Failed to create the color buffer object');
        return -1;
    }    
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, groundParams.colors, gl.STATIC_DRAW);

    return {
        vertex: vertexBuffer,
        vertexCount: groundParams.numVertices,
        numVertexAttributes: nVertexAttributes,
        color: colorBuffer,
        numColorAttributes: nColorAttributes,
    };
}

function drawPartSysBouncy()
{
    g_isClear = 0;
    if (g_isClear == 1) gl.clear(gl.COLOR_BUFFER_BIT);

    var programInfoA = g_partA.getProgramInfo();
    // specify the perspective projection required for viewing
    setProjectionMatrix(gl, programInfoA);
    // specify the modelView matrix for transforming our particle system
    g_partA.setModelViewMatrixBouncy();

    if (false == bIsPaused)
    {
        // find current net force on each particle
        g_partA.applyForces(g_partA.s1, g_partA.forceList);
        // find time-derivative s1dot from s1;
        g_partA.dotFinder(g_partA.s1dot, g_partA.s1);
        // find s2 from s1 & related states.
        g_partA.solver();
        // Apply all constraints, s2 is ready!
        g_partA.doConstraints(g_partA.limitList);
        // transfer current state to VBO, set uniforms, draw it!
        g_partA.render(0);
        // Make s2 the new current state s1.s
        g_partA.swap();
    }
    else
    {
        // transfer current state to VBO, set uniforms, draw it!
        g_partA.render(0);        
    }
}

function drawPartSysReevesFire()
{
    g_isClear = 0;
    if (g_isClear == 1) gl.clear(gl.COLOR_BUFFER_BIT);

    var programInfoC = g_partC.getProgramInfo();
    // specify the perspective projection required for viewing
    setProjectionMatrix(gl, programInfoC);
    // specify the modelView matrix for transforming our particle system
    g_partC.setModelViewMatrixReevesFire();

    if (false == bIsPaused)
    {
        // find current net force on each particle
        g_partC.applyForces(g_partC.s1, g_partC.forceList);
        // find time-derivative s1dot from s1;
        g_partC.dotFinder(g_partC.s1dot, g_partC.s1);
        // find s2 from s1 & related states.
        g_partC.solver();
        // Apply all constraints, s2 is ready!
        g_partC.doConstraints(g_partC.limitList);
        // transfer current state to VBO, set uniforms, draw it!
        g_partC.render(0);
        // Make s2 the new current state s1.s
        g_partC.swap();        
    }
    else
    {
        // transfer current state to VBO, set uniforms, draw it!
        g_partC.render(0);       
    }
}

function drawPartSysTornado()
{
    g_isClear = 0;
    if (g_isClear == 1) gl.clear(gl.COLOR_BUFFER_BIT);

    var programInfoD = g_partD.getProgramInfo();
    // specify the perspective projection required for viewing
    setProjectionMatrix(gl, programInfoD);
    // specify the modelView matrix for transforming our particle system
    g_partD.setModelViewMatrixTornado();

    if (false == bIsPaused)
    {
        // find current net force on each particle
        g_partD.applyForces(g_partD.s1, g_partD.forceList);
        // find time-derivative s1dot from s1;
        g_partD.dotFinder(g_partD.s1dot, g_partD.s1);
        // find s2 from s1 & related states.
        g_partD.solver();
        // Apply all constraints, s2 is ready!
        g_partD.doConstraints(g_partD.limitList);
        // transfer current state to VBO, set uniforms, draw it!
        g_partD.render(0);
        // Make s2 the new current state s1.s
        g_partD.swap();        
    }
    else
    {
        // transfer current state to VBO, set uniforms, draw it!
        g_partD.render(0);       
    }
}

function drawPartSysBoids()
{
    g_isClear = 0;
    if (g_isClear == 1) gl.clear(gl.COLOR_BUFFER_BIT);

    var programInfoE = g_partE.getProgramInfo();
    // specify the perspective projection required for viewing
    setProjectionMatrix(gl, programInfoE);
    // specify the modelView matrix for transforming our particle system
    g_partE.setModelViewMatrixBoids();

    if (false == bIsPaused)
    {
        // find current net force on each particle
        g_partE.applyForces(g_partE.s1, g_partE.forceList);
        // find time-derivative s1dot from s1;
        g_partE.dotFinder(g_partE.s1dot, g_partE.s1);
        // find s2 from s1 & related states.
        g_partE.solver();
        // Apply all constraints, s2 is ready!
        g_partE.doConstraints(g_partE.limitList);
        // transfer current state to VBO, set uniforms, draw it!
        g_partE.render(0);
        // Make s2 the new current state s1.s
        g_partE.swap();        
    }
    else
    {
        // transfer current state to VBO, set uniforms, draw it!
        g_partE.render(0);       
    }
}

function drawPartSysFallingParts()
{
    g_isClear = 0;
    if (g_isClear == 1) gl.clear(gl.COLOR_BUFFER_BIT);

    var programInfoF = g_partF.getProgramInfo();
    // specify the perspective projection required for viewing
    setProjectionMatrix(gl, programInfoF);
    // specify the modelView matrix for transforming our particle system
    g_partF.setModelViewMatrixFallingParts();

    if (false == bIsPaused)
    {
        // find current net force on each particle
        g_partF.applyForces(g_partF.s1, g_partF.forceList);
        // find time-derivative s1dot from s1;
        g_partF.dotFinder(g_partF.s1dot, g_partF.s1);
        // find s2 from s1 & related states.
        g_partF.solver();
        // Apply all constraints, s2 is ready!
        g_partF.doConstraints(g_partF.limitList);
        // transfer current state to VBO, set uniforms, draw it!
        g_partF.render(0);
        // Make s2 the new current state s1.s
        g_partF.swap();        
    }
    else
    {
        // transfer current state to VBO, set uniforms, draw it!
        g_partF.render(0);       
    }
}

function drawPartSysCloth()
{
    g_isClear = 0;
    if (g_isClear == 1) gl.clear(gl.COLOR_BUFFER_BIT);

    var programInfoG = g_partG.getProgramInfo();
    // specify the perspective projection required for viewing
    setProjectionMatrix(gl, programInfoG);
    // specify the modelView matrix for transforming our particle system
    g_partG.setModelViewMatrixCloth();

    if (false == bIsPaused)
    {
        // find current net force on each particle
        g_partG.applyForces(g_partG.s1, g_partG.forceList);
        // find time-derivative s1dot from s1;
        g_partG.dotFinder(g_partG.s1dot, g_partG.s1);
        // find s2 from s1 & related states.
        g_partG.solver();
        // Apply all constraints, s2 is ready!
        g_partG.doConstraints(g_partG.limitList);
        // transfer current state to VBO, set uniforms, draw it!
        g_partG.render(2);
        // Make s2 the new current state s1.s
        g_partG.swap();        
    }
    else
    {
        // transfer current state to VBO, set uniforms, draw it!
        g_partG.render(2);       
    }
}

function drawCube(gl, buffers, programInfo)
{
    // use the given programInfo
    gl.useProgram(programInfo.program);
    gl.program = programInfo.program;

    // specify the layout of the input buffer provided to the VS
    setVertexInputLayout(gl, buffers, programInfo);

    // specify the perspective projection required for viewing
    setProjectionMatrix(gl, programInfo);

    // amount of angle to be rotated in 1000ms
    angleQuant = 90;
    // set the angle at which we want our cube now
    currentAngle += (g_timeStep * angleQuant)/1000;
    // specify the modelView matrix for transforming our cube
    setModelViewMatrixCube(gl, programInfo, currentAngle);

    // data type for indices
    const type = gl.UNSIGNED_SHORT;
    const offset = 0;
    gl.drawElements(gl.TRIANGLES, buffers.vertexCount, type, offset);
}

function drawCube2(gl, buffers, programInfo)
{
    // use the given programInfo
    gl.useProgram(programInfo.program);
    gl.program = programInfo.program;

    // specify the layout of the input buffer provided to the VS
    setVertexInputLayout(gl, buffers, programInfo);

    // specify the perspective projection required for viewing
    setProjectionMatrix(gl, programInfo);

    // amount of angle to be rotated in 1000ms
    angleQuant = 90;
    // set the angle at which we want our cube now
    currentAngle += (g_timeStep * angleQuant)/1000;
    // specify the modelView matrix for transforming our cube
    setModelViewMatrixCube2(gl, programInfo, currentAngle);

    // data type for indices
    const type = gl.UNSIGNED_SHORT;
    const offset = 0;
    gl.drawElements(gl.TRIANGLES, buffers.vertexCount, type, offset);
}

function drawPlane(gl, buffers, programInfo)
{
    // use the given programInfo
    gl.useProgram(programInfo.program);
    gl.program = programInfo.program;

    // specify the layout of the input buffer provided to the VS
    setVertexInputLayout(gl, buffers, programInfo);

    // specify the perspective projection required for viewing
    setProjectionMatrix(gl, programInfo);

    // specify the modelView matrix for transforming our cube
    setModelViewMatrixPlane(gl, programInfo);

    // data type for indices
    const type = gl.UNSIGNED_SHORT;
    const offset = 0;
    gl.drawElements(gl.TRIANGLES, buffers.vertexCount, type, offset);
}

function drawGround(gl, buffers, programInfo)
{
    // use the given programInfo
    gl.useProgram(programInfo.program);
    gl.program = programInfo.program;

    // specify the layout of the input buffer provided to the VS
    setVertexInputLayout(gl, buffers, programInfo);

    // specify the perspective projection required for viewing
    setProjectionMatrix(gl, programInfo);

    // specify the modelView matrix for transforming our ground
    // temp:
    var currentAngleTemp = 0;
    setModelViewMatrixGround(gl, programInfo, currentAngleTemp);
    
    // start drawing from this index in vertex array
    var nFirst = 0;

    // Draw just the ground-plane's vertices
	gl.drawArrays(gl.LINES, nFirst, buffers.vertexCount);
}

function drawScene(gl, programInfo)
{
    // specify the colour that we want for clearing
    gl.clearColor(0.4, 0.7, 0.8, 1.0);

    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
  
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Draw ground first
    drawGround(gl, buffersGround, programInfo);

    // Without clearing screen, draw cubes now
    drawCube(gl, buffersCube, programInfo);
    drawCube2(gl, buffersCube2, programInfo);

    // draw the plane used for sliding particles
    drawPlane(gl, buffersPlane, programInfo);

    // draw the first particle system - Bouncy Balls
    drawPartSysBouncy();

    // draw the third particle system - Reeves Fire
    drawPartSysReevesFire();
    
    // draw the fourth particle system - Tornado
    drawPartSysTornado();

    // draw the fifth particle system - Boids
    drawPartSysBoids();

    // draw the sixth particle system - Falling Particles
    drawPartSysFallingParts();

    // draw the seventh particle system - Cloth
    drawPartSysCloth();
    
}


/**
 * Event Handler/Camera Controls Section:
 * 
 * Using EventHandlerUtils.js for handling
 * changes related to camera parameters
 */
function initializeEventListeners()
{
    console.log("initializeEventListeners called");

    window.addEventListener("keydown", myKeyDown, false);
}

function myKeyDown(kev)
{
	switch (kev.code) {
		case "ArrowLeft":
            eventHandler.tiltCameraLeft();
			console.log("Arrow-Left key (Turn left)");
			break;
		case "ArrowRight":
            eventHandler.tiltCameraRight();
			console.log("Arrow-Right key (Turn right)");
			break;
		case "ArrowUp":
            eventHandler.tiltCameraUp();
			console.log("Arrow-Up key (Turn upwards)");
			break;
		case "ArrowDown":
            eventHandler.tiltCameraDown();
			console.log("Arrow-Down key (Turn downwards)");
			break;
        case "KeyW":
            eventHandler.moveCameraFront();
			console.log("W key (Move front)");
            break;
        case "KeyS":
            eventHandler.moveCameraBack();
			console.log("S key (Move back)");
            break;
        case "KeyA":
            eventHandler.moveCameraLeft();
			console.log("W key (Move front)");
            break;
        case "KeyD":
            eventHandler.moveCameraRight();
			console.log("S key (Move back)");
            break;
        case "KeyE":
            eventHandler.moveCameraUp();
			console.log("E key (move vertically up)");
            break;
        case "KeyC":
            eventHandler.moveCameraDown();
			console.log("C key (move vertically down)");
            break;
        case "KeyG":
            initCameraParams();
			console.log("G key (Reset Camera)");
            break;

        case "KeyR":
			console.log("R key (Reset)");
            if(true)
            {
                g_partA.runMode = 3;  // RUN!
                var j=0; // array index for particle i
                for(var i = 0; i < g_partA.partCount; i += 1, j+= Properties.maxVariables)
                {
                    g_partA.roundRand();  // make a spherical random var.
                    if(  g_partA.s2[j + Properties.velocity.x] > 0.0) // ADD to positive velocity, and 
                        g_partA.s2[j + Properties.velocity.x] += 1.7 + 0.4*g_partA.randX*g_partA.INIT_VEL;
                                                            // SUBTRACT from negative velocity: 
                    else g_partA.s2[j + Properties.velocity.x] -= 1.7 + 0.4*g_partA.randX*g_partA.INIT_VEL; 
        
                    if(  g_partA.s2[j + Properties.velocity.y] > 0.0) 
                        g_partA.s2[j + Properties.velocity.y] += 1.7 + 0.4*g_partA.randY*g_partA.INIT_VEL; 
                    else g_partA.s2[j + Properties.velocity.y] -= 1.7 + 0.4*g_partA.randY*g_partA.INIT_VEL;
        
                    if(  g_partA.s2[j + Properties.velocity.z] > 0.0) 
                        g_partA.s2[j + Properties.velocity.z] += 1.7 + 0.4*g_partA.randZ*g_partA.INIT_VEL; 
                    else g_partA.s2[j + Properties.velocity.z] -= 1.7 + 0.4*g_partA.randZ*g_partA.INIT_VEL;
                    }
            }
            break;
        case "KeyT":
            console.log("T key (Spring Pull)");
            if (true)
            {
                var m = 12;
                var j = m * Properties.maxVariables;
                for( ; m < 16 ; m += 1, j += Properties.maxVariables)
                {
                    console.log("1st: "+g_partG.s2[j + Properties.position.z]);
                    g_partG.s1[j + Properties.position.z] -= 0.25;
                    console.log("1st CHANGED: "+g_partG.s2[j + Properties.position.z]);
                }

            }
            break;
        case "KeyP":
            console.log("P key (pause)");
            bIsPaused = true;
            break;
        case "KeyL":
            console.log("L key (play");
            bIsPaused = false;
            break;
        case "KeyU":
            console.log("U key (move tornado)");
            tornado_y += 2.5;
            break;
        case "KeyJ":
            console.log("J key (move tornado)");
            tornado_y -= 2.5;
            break;
        case "KeyH":
            tornado_x -= 2.5;
            console.log("H key (move tornado)");
            break;
        case "KeyK":
            tornado_x += 2.5;
            console.log("K key (move tornado)");
            break;    
		default:
			console.log("UNUSED key:", kev.keyCode);
			break;
	}
}

window.onload = main();