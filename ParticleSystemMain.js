// Basic init code
// Render blue screen using canvas element

function main()
{
    // Get the canvas element to draw using WebGL
    const canvas = document.getElementById("glCanvas");
    // Initialize GL context
    const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });

    // Only continue if WebGL is available and working
    if (null == gl)
    {
        console.log("main() Failed to get rendering context for WebGL");
        return;
    }

    // Set clear color to black, fully opaque
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // Clear the color buffer with specified clear color
    gl.clear(gl.COLOR_BUFFER_BIT);

    // get the vertex and fragment shader strings
    var vsSource = document.getElementById("vertex-shader").textContent;
    var fsSource = document.getElementById("fragment-shader").textContent;
    // Initialize shaders and set the program with VS and FS source as given in input
    if (!initShaders(gl, vsSource, fsSource))
    {
		console.log('main() Failed to intialize shaders.');
		return;
    }
    
    // Look up all the attributes and uniforms our shader program is using
    // and store them in programInfo to be used directly later
    const programInfo = getAtrribsAndUniforms(gl);

    // Initialize the buffers that we will need
    var buffers = initBuffers(gl);

    // Draw the cube
    drawScene(gl, programInfo, buffers);
}

function getAtrribsAndUniforms(gl)
{
    const programInfo =
    {
        program: gl.program,
        attribLocations:
        {
          vertexPosition: gl.getAttribLocation(gl.program, 'a_Position'),
        //   vertexColor: gl.getAttribLocation(gl.program, 'aVertexColor'),
        },
        uniformLocations:
        {
        //   projectionMatrix: gl.getUniformLocation(gl.program, 'uProjectionMatrix'),
        //   modelViewMatrix: gl.getUniformLocation(gl.program, 'uModelViewMatrix'),
        }
    };

    if (programInfo.attribLocations.vertexPosition < 0)
    {
        console.log('Failed to get the storage location of a_Position');
        return -1;
    }

    return programInfo;
}

function setVertexInputLayout(gl, buffers, programInfo)
{
    // Bind the buffer object to target (gl.ARRAY_BUFFER = vertexBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertex);

    // # of values in this attrib (1,2,3,4) 
    const nAttributes = 3;
    // data type (usually gl.FLOAT)
    const dataType = gl.FLOAT;
    // use integer normalizing? (usually false)
    const bNormalize = false;
    // Stride: #bytes from 1st stored value to next 
    const stride = 0;
    // Offiset; #bytes from start of buffer to the 1st attrib value to be used
    const offset = 0;
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

    // Tell WebGL which indices to use to index the vertices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
}

function initBuffers(gl)
{
    // array of vertex positions collection of (x,y,z)'s
    const f = 0.5;
    var vertices = new Float32Array ([
        -f, -f,  f, // 0
         f, -f,  f, // 1
         f,  f,  f, // 2
        -f,  f,  f, // 3
      
        -f, -f, -f, // 4
        -f,  f, -f, // 5
         f,  f, -f, // 6
         f, -f, -f  // 7
    ]);

    var indices = new Uint16Array ([
        0,  1,  2,      0,  2,  3,  // front
        4,  5,  6,      4,  6,  7,  // back
        5,  3,  2,      5,  2,  6,  // top
        4,  7,  1,      4,  1,  0,  // bottom
        7,  6,  2,      7,  2,  1,  // right
        4,  0,  3,      4,  3,  5,  // left
    ]);

    // # vertices to be draw in total (count of indices)
    var nVertices = 36;

    // # bytes per floating-point value;
    FSIZE = vertices.BYTES_PER_ELEMENT;

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
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Create Buffer, Bind to Index Buffer, Write Data
    var indexBuffer = gl.createBuffer();
    if (!indexBuffer)
    {
        console.log('Failed to create the index buffer object');
        return -1;
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);


    return {
        vertex: vertexBuffer,
        vertexCount: nVertices,
        indices: indexBuffer,
    };
}

function drawScene(gl, programInfo, buffers)
{
    // specify the colour that we want for clearing
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT);
  
    // specify the layout of the input buffer provided to the VS
    setVertexInputLayout(gl, buffers, programInfo);

    // data type for indices
    const type = gl.UNSIGNED_SHORT;
    const offset = 0;
    gl.drawElements(gl.TRIANGLES, buffers.vertexCount, type, offset);
}

window.onload = main();