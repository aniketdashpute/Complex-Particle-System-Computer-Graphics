// Render a cube on a black screen

function main()
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

    // initialize the shaders and create program
    initializeShaders(gl);
    
    // Look up all the attributes and uniforms our shader program is using
    // and store them in programInfo to be used directly later
    const programInfo = getAtrribsAndUniforms(gl);

    // Initialize the buffers that we will need
    var buffers = initBuffers(gl);

    // Draw the cube
    drawScene(gl, programInfo, buffers);
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

    var projectionMatrix = new Matrix4();
    projectionMatrix.setIdentity();

    projectionMatrix.perspective(
        fieldOfView,
        aspect,
        zNear,
        zFar);
    
    
    // In this coord system, our up vector is z-axis
    // Initially, our viewing angle is such that the screen is x-z plane
    // and inside screen is +y-axis

    // The position of the eye point
    var eyeX = 0.0, eyeY = -10.0, eyeZ = 0.0;
    // The position of the reference point
    var centerX = 0.0, centerY = 0.0, centerZ = 0.0;
    // 'up' vector
    var upX = 0.0, upY = 0.0, upZ = 1.0;
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
    modelViewMatrix.translate(0.0, 0.0, 3.0);
    // scale cube
    modelViewMatrix.scale(1.0, 1.0, 1.0);
    // rotate cube around specified axis (ax,ay,az)
    modelViewMatrix.rotate(currentAngle, 0, 1, 0);

    // Pass our current matrix to the vertex shaders:
	gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix.elements);
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
    // # of values in this attrib (x,y,z) => 3
    var nAttributes = 3;
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
    // # of values in this attrib (r,g,b,w) => 4
    nAttributes = 4;
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
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
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

function initBuffers(gl)
{
    // get the data of vertices, indices and color for a cube
    cubeParams = makeCube();

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
        index: indexBuffer,
        color: colorBuffer,
    };
}

function drawScene(gl, programInfo, buffers)
{
    // specify the colour that we want for clearing
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
  
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
    // specify the layout of the input buffer provided to the VS
    setVertexInputLayout(gl, buffers, programInfo);

    // specify the perspective projection required for viewing
    setProjectionMatrix(gl, programInfo);

    // specify the modelView matrix for transforming our cube
    // temp:
    var currentAngle = 45;
    setModelViewMatrixCube(gl, programInfo, currentAngle);

    // data type for indices
    const type = gl.UNSIGNED_SHORT;
    const offset = 0;
    gl.drawElements(gl.TRIANGLES, buffers.vertexCount, type, offset);
}

window.onload = main();