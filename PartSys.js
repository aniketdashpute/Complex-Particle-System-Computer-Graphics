/*******************************************************************
* File: PartSys.js
* Author: Aniket Dashpute
* Credits:
* Most of the code is starter code
* by Prof. Jack Tumblin, Northwestern University
* Incorporated some of the coding style from:
* https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial
*******************************************************************/

const Properties = {
    position:
    {
        x: 0,
        y: 1,
        z: 2,
        w: 3,
    },
    velocity:
    {
        x: 4,
        y: 5,
        z: 6,
    },
    force:
    {
        x: 7,
        y: 8,
        z: 9,
    },
    color:
    {
        r: 10,
        g: 11,
        b: 12,
        a: 13,
    },
    // mass, in kilograms
    mass: 14,
    // on-screen diameter (in pixels)
    diameter: 15,
    // on-screen appearance (square, round, or soft-round)
    renderMode: 16,
    // # of frame-times until re-initializing (Reeves Fire)
    age: 17,
    /*charge: 17,
    massVelocity: 18,
    massForceAccum: 19,
    colorVelocity:
    {
        r: 20,
        g: 21,
        b: 22,
    },
    colorForceAccum:
    {
        r: 23,
        g: 24,
        b: 25,
    },*/
    maxVariables: 18,
};

const Solver = {
    // EXPLICIT methods:
    // Euler integration: forward,explicit,...
    Euler: 0,
    // Midpoint Method (see Pixar Tutorial)
    Midpoint: 1,
    // Adams-Bashforth Explicit Integrator
    AdamsBash: 2,
    // Arbitrary degree, set by 'solvDegree'
    RungeKutta: 3,

    // IMPLICIT methods:
    OldGood: 4,
    BackEuler: 5,
    BackMidpoint: 6,
    BackAdamsBash: 7,

    // SEMI-IMPLICIT METHODS:
    Verlet: 8,
    VelocityVerlet: 9,
    Leapfrog: 10,

    // number of solver types available
    Max: 11,
};

// a tiny amount; a minimum vector length
const NU_EPSILON  = 10E-15;


function PartSys()
{
    // Constructor for a new particle system.
    this.randX = 0;
    this.randY = 0;
    this.randZ = 0;
    this.isFountain = 0;
    this.forceList = [];
    this.limitList = [];
    this.name = "Particle System - ";
    
    // print out the properties and solver enums
    console.log(Properties);
    console.log(Solver);
}

PartSys.prototype.initBouncy2D = function(count)
{
    console.log('PartSys.Bouncy2D() initializing...');

    this.name = "Bouncy Balls Particle System";

    // get the vertex and fragment shader strings
    var vsSource = document.getElementById("vertex-shader").textContent;
    var fsSource = document.getElementById("fragment-shader-balls-grad").textContent;    
    this.program = createProgram(gl, vsSource, fsSource);
    if (!this.program) {
      console.log('Failed to create program');
      return false;
    }
    gl.useProgram(this.program);
    gl.program = this.program;
    this.programInfo = getAtrribsAndUniforms(gl);

    // Create all state-variables
    this.partCount = count;
    this.s1 =    new Float32Array(this.partCount * Properties.maxVariables);
    this.s2 =    new Float32Array(this.partCount * Properties.maxVariables);
    this.s1dot = new Float32Array(this.partCount * Properties.maxVariables);
    // for midpoint solver:
    this.sM =    new Float32Array(this.partCount * Properties.maxVariables);
    this.sMdot = new Float32Array(this.partCount * Properties.maxVariables);
    // Float32Array objects are zero-filled by default




    // Create force-causing objects:
    var fTmp = new CForcer();

    // earth gravity for all particles:
    fTmp.forceType = Forces.EarthGravity;
    // set it to affect ALL particles
    fTmp.targFirst = 0;
    // (negative value means ALL particles)
    fTmp.partCount = -1;
    // (and IGNORE all other Cforcer members...)
    // append this to the forceList array of force-causing objects
    this.forceList.push(fTmp);

    // drag for all particles:
    fTmp = new CForcer();
    // Viscous Drag
    fTmp.forceType = Forces.Drag;
    // in Euler solver, scales velocity by 0.85
    fTmp.Kdrag = 0.15;
    // apply it to ALL particles
    fTmp.targFirst = 0;
    // negative value means ALL particles
    fTmp.partCount = -1;
    // (and IGNORE all other Cforcer members...)
    // append this to the forceList array of force-causing objects
    this.forceList.push(fTmp);

    // Report:
    console.log("PartSys.initBouncy2D() created PartSys.forceList[] array of ");
    console.log("\t\t", this.forceList.length, "CForcer objects:");
    for(i=0; i<this.forceList.length; i++)
    {
        console.log("CForceList[",i,"]");
        this.forceList[i].printMe();
    }




    // Create constraint-causing objects:
    var cTmp = new CLimit();
    // set how particles 'bounce' from its surface
    cTmp.hitType = HitType.BounceVelocityReversal;
    // confine particles inside axis-aligned rectangular volume
    cTmp.limitType = LimitType.Volume;
    // applies to ALL particles; starting at 0
    cTmp.targFirst = 0;
    // through all the rest of them
    cTmp.partCount = -1;
    // box extent:  +/- 1.0 box at origin
    cTmp.xMin = 0.0; cTmp.xMax = 2.0;
    cTmp.yMin = 0.0; cTmp.yMax = 2.0;
    cTmp.zMin = 0.0; cTmp.zMax = 2.0;
    // bouncyness: coeff. of restitution.
    cTmp.Kresti = 1.0;
    // (and IGNORE all other CLimit members...)
    // append this to array of constraint-causing objects
    this.limitList.push(cTmp);

    // Create constraint-causing objects:
    var cTmp = new CLimit();
    // set how particles 'bounce' from its surface
    cTmp.hitType = -1;//HitType.BounceVelocityReversal;
    // confine particles inside axis-aligned rectangular volume
    cTmp.limitType = LimitType.Box;
    // applies to ALL particles; starting at 0
    cTmp.targFirst = 0;
    // through all the rest of them
    cTmp.partCount = -1;
    // box extent:
    cTmp.xMin = 0.0; cTmp.xMax = 2.0;
    cTmp.yMin = 1.0; cTmp.yMax = 2.0;
    cTmp.zMin = 1.0; cTmp.zMax = 2.0;
    // bouncyness: coeff. of restitution.
    cTmp.Kresti = 1.0;
    // (and IGNORE all other CLimit members...)
    // append this to array of constraint-causing objects
    this.limitList.push(cTmp);

    // Report:
    console.log("PartSys.initBouncy2D() created PartSys.limitList[] array of ");
    console.log("\t\t", this.limitList.length, "CLimit objects.");
    for(i=0; i<this.limitList.length; i++)
    {
        console.log("CLimitList[",i,"]");
        this.limitList[i].printMe();
    }




    // initial velocity in meters/sec.
    // adjust by ++Start, --Start buttons. Original value 
    // was 0.15 meters per timestep; multiply by 60 to get meters per second.
    this.INIT_VEL =  0.15 * 60.0;

    // units-free air-drag (scales velocity); adjust by d/D keys
    this.drag = 0.985;
    // gravity's acceleration(meter/sec^2); adjust by g/G keys
    this.grav = 9.832;
    // units-free 'Coefficient of Restitution'
    this.resti = 1.0;




    // Initialize Particle System Controls:

    // Master Control: 0=reset; 1= pause; 2=step; 3=run
    this.runMode =  3;
    // adjust by s/S keys
    this.solvType = Solver.OldGood;
    // floor-bounce constraint type:
    // ==0 for velocity-reversal, as in all previous versions
    // ==1 for Chapter 3's collision resolution method, which uses
    // an 'impulse' to cancel any velocity boost caused by falling below the floor
    this.bounceType = 1;



    
    // Create and fill VBO with state s1 contents:

    // i = particle number; j = array index for i-th particle
    var j = 0;
    for (var i = 0; i < this.partCount; i += 1, j+= Properties.maxVariables)
    {
        // set this.randX,randY,randZ to random location in
        // a 3D unit sphere centered at the origin
        this.roundRand();
        // all our bouncy-balls stay within a +/- 0.9 cube centered at origin; 
        // set random positions in a 0.1-radius ball centered at (0.8,0.8,0.8)
        this.s1[j + Properties.position.x] = 0.8 + 0.1*this.randX; 
        this.s1[j + Properties.position.y] = 0.8 + 0.1*this.randY;  
        this.s1[j + Properties.position.z] = 0.8 + 0.1*this.randZ;
        this.s1[j + Properties.position.w] =  1.0;

        // Now choose random initial velocities too:
        this.roundRand();
        this.s1[j + Properties.velocity.x] =  this.INIT_VEL*(0.4 + 0.2*this.randX);
        this.s1[j + Properties.velocity.y] =  this.INIT_VEL*(0.4 + 0.2*this.randY);
        this.s1[j + Properties.velocity.z] =  this.INIT_VEL*(0.4 + 0.2*this.randZ);

        // give initial color to the particles
        this.s1[j + Properties.color.r] = 0.8;
        this.s1[j + Properties.color.g] = 0.2;
        this.s1[j + Properties.color.b] = 0.2;
        this.s1[j + Properties.color.a] =  1.0;

        // mass, in kg.
        this.s1[j + Properties.mass] =  1.0;
        // on-screen diameter, in pixels
        this.s1[j + Properties.diameter] =  2.0 + 10*Math.random();
        this.s1[j + Properties.renderMode] = 0.0;
        this.s1[j + Properties.age] = 30 + 100*Math.random();
    }
    // COPY contents of state-vector s1 to s2
    this.s2.set(this.s1);




    // create index buffer, vertex buffer and color buffer
    // required for the particle system rendering
    this.createVertexAndColorBuffers();
}

PartSys.prototype.initCloth = function(count1, count2)
{
    console.log('PartSys.Cloth() initializing...');

    this.name = "Cloth Particle System";

    // get the vertex and fragment shader strings
    var vsSource = document.getElementById("vertex-shader").textContent;
    var fsSource = document.getElementById("fragment-shader").textContent;    
    this.program = createProgram(gl, vsSource, fsSource);
    if (!this.program) {
      console.log('Failed to create program');
      return false;
    }
    gl.useProgram(this.program);
    gl.program = this.program;
    this.programInfo = getAtrribsAndUniforms(gl);

    // Create all state-variables
    this.partCount = count1 * count2 + 2;
    this.s1 =    new Float32Array(this.partCount * Properties.maxVariables);
    this.s2 =    new Float32Array(this.partCount * Properties.maxVariables);
    this.s1dot = new Float32Array(this.partCount * Properties.maxVariables);  
    // for midpoint solver:
    this.sM =    new Float32Array(this.partCount * Properties.maxVariables);
    this.sMdot = new Float32Array(this.partCount * Properties.maxVariables);
    // Float32Array objects are zero-filled by default


    // for this Cloth only:
    var K_spring = 40.0
    var K_springDamp = 3.0;
    var K_restLength = 1.0;


    // Create force-causing objects:
    var fTmp;

    var indexarray = [];

    nIndexCount = 0;
    // create the spring forces between the 4 particles of the tetrahedron
    for (var i = 0; i < count1; i++)
    {
        for (var j = 0; j < count2; j++)
        {
            // connection from (i,j) to neighbours -
            // east, south-east, south, south-west
            var deltaI = [0, 1, 1, 1];
            var deltaJ = [1, 1, 0, -1];
            for (k = 0; k < 4; k++)
            {
                var i1 = i + deltaI[k];
                var j1 = j + deltaJ[k];
                if (i1 < count1 && i1 >= 0 && j1 < count2 && j1 >=0)
                {
                    //console.log("Connecting from P: "+i+j + "to: "+i1+j1);
                    
                    // fill the index buffer to draw the springs
                    var p1 = i * count2 + j;
                    var p2 = i1 * count2 + j1;
                    indexarray = indexarray.concat(p1, p2);

            fTmp = new CForcer();
            // Two particle spring system:
            fTmp.forceType = Forces.Spring;
            // set it to affect ALL particles
            fTmp.targFirst = 0;
            // For springs, set targCount=0 & use e1,e2
            fTmp.targCount = 0;
            // start point particle number
                    fTmp.e1 = p1;
            // end point particle number
                    fTmp.e2 = p2;
            // Spring constant: force = stretchDistance*K_spring
                    fTmp.K_spring = K_spring;
            // Spring damping: (friction within the spring);
            // force = -relVel*K_damp; 'relative velocity' is
            // how fast the spring length is changing, and
            // applied along the direction of the spring.
                    fTmp.K_springDamp = K_springDamp;
            // the zero-force length of this spring.      
                    fTmp.K_restLength = Math.sqrt((i-i1)*(i-i1) + (j-j1)*(j-j1));
            // (and IGNORE all other Cforcer members...)
            // append this to the forceList array of force-causing objects
            this.forceList.push(fTmp);

                    nIndexCount = nIndexCount + 2;
                }
            }
            
        }
    }

    // 2 more particles at the end to hold the cloth
    var p1 = count1 * count2;
    var p2 = 0;
    indexarray = indexarray.concat(p1, p2);
    // create spring force
    fTmp = new CForcer();
    // Two particle spring system:
    fTmp.forceType = Forces.Spring;
    // set it to affect ALL particles
    fTmp.targFirst = 0;
    // For springs, set targCount=0 & use e1,e2
    fTmp.targCount = 0;
    // start point particle number
    fTmp.e1 = p1;
    // end point particle number
    fTmp.e2 = p2;
    // Spring constant: force = stretchDistance*K_spring
    fTmp.K_spring = K_spring;
    // Spring damping: (friction within the spring)
    fTmp.K_springDamp = K_springDamp;
    // the zero-force length of this spring.      
    fTmp.K_restLength = K_restLength;
    // (and IGNORE all other Cforcer members...)
    // append this to the forceList array of force-causing objects
    this.forceList.push(fTmp);
    // indexCount increment
    nIndexCount = nIndexCount + 2;

    p1 = count1 * count2 + 1;
    p2 = count2 - 1;
    indexarray = indexarray.concat(p1, p2);
    // create spring force
    fTmp = new CForcer();
    // Two particle spring system:
    fTmp.forceType = Forces.Spring;
    // set it to affect ALL particles
    fTmp.targFirst = 0;
    // For springs, set targCount=0 & use e1,e2
    fTmp.targCount = 0;
    // start point particle number
    fTmp.e1 = p1;
    // end point particle number
    fTmp.e2 = p2;
    // Spring constant: force = stretchDistance*K_spring
    fTmp.K_spring = K_spring;
    // Spring damping: (friction within the spring)
    fTmp.K_springDamp = K_springDamp;
    // the zero-force length of this spring.      
    fTmp.K_restLength = K_restLength;
    // (and IGNORE all other Cforcer members...)
    // append this to the forceList array of force-causing objects
    this.forceList.push(fTmp);
    // indexCount increment
    nIndexCount = nIndexCount + 2;

    // create the list of indices and assign the count
    this.indices = new Uint16Array (indexarray);
    this.indexCount = nIndexCount;





    // drag for all particles:
    fTmp = new CForcer();
    // Viscous Drag
    fTmp.forceType = Forces.Drag;
    // in Euler solver, scales velocity by 0.85
    fTmp.Kdrag = 0.1;
    // apply it to ALL particles
    fTmp.targFirst = 0;
    // negative value means ALL particles
    fTmp.partCount = count1 * count2;
    // (and IGNORE all other Cforcer members...)
    // append this to the forceList array of force-causing objects
    this.forceList.push(fTmp);

    // gravity for all particles
    fTmp = new CForcer();
    // earth gravity for all particles:
    fTmp.forceType = Forces.EarthGravity;
    // set it to affect ALL particles
    fTmp.targFirst = 0;
    // (negative value means ALL particles)
    fTmp.partCount = count1 * count2;
    // (and IGNORE all other Cforcer members...)
    // append this to the forceList array of force-causing objects
    this.forceList.push(fTmp);

    // Anchor force!
    p1 = count1 * count2;
    // create spring force
    fTmp = new CForcer();
    // Two particle spring system:
    fTmp.forceType = Forces.Anchor;
    // first particle number for applying force
    fTmp.targFirst = p1;
    // till which particle number
    fTmp.targCount = p1 + 2;
    // (and IGNORE all other Cforcer members...)
    // append this to the forceList array of force-causing objects
    this.forceList.push(fTmp);



    // Report:
    console.log("PartSys.Cloth() created PartSys.forceList[] array of ");
    console.log("\t\t", this.forceList.length, "CForcer objects:");
    for(i=0; i<this.forceList.length; i++)
    {
        console.log("CForceList[",i,"]");
        this.forceList[i].printMe();
    }






    // Create constraint-causing objects:
    var cTmp = new CLimit();
    // set how particles 'bounce' from its surface
    cTmp.hitType = HitType.BounceImpulsive;
    // confine particles inside axis-aligned rectangular volume
    cTmp.limitType = LimitType.Volume;
    // applies to ALL particles; starting at 0
    cTmp.targFirst = 0;
    // through all the rest of them
    cTmp.partCount = -1;
    // box extent:  +/- 1.0 box at origin
    var boxLen = 20.0;
    cTmp.xMin = -boxLen; cTmp.xMax = boxLen;
    cTmp.yMin = -2 * boxLen; cTmp.yMax = 2 *boxLen;
    cTmp.zMin = -0.5*boxLen; cTmp.zMax = boxLen;
    // bouncyness: coeff. of restitution.
    cTmp.Kresti = 0.9;
    // (and IGNORE all other CLimit members...)
    // append this to array of constraint-causing objects
    this.limitList.push(cTmp);



    // Anchor first particle
    cTmp = new CLimit();
    // set how particles 'bounce' from its surface
    cTmp.hitType = -1;//HitType.BounceImpulsive;
    // confine particles inside axis-aligned rectangular volume
    cTmp.limitType = LimitType.Distance.Anchor;
    // applies to ALL particles; starting at 0
    cTmp.targFirst = count1 * count2;
    // through all the rest of them
    cTmp.partCount = 2;
    // (and IGNORE all other CLimit members...)
    // append this to array of constraint-causing objects
    this.limitList.push(cTmp);

    // Report:
    console.log("PartSys.Cloth() created PartSys.limitList[] array of ");
    console.log("\t\t", this.limitList.length, "CLimit objects.");
    for(i=0; i<this.limitList.length; i++)
    {
        console.log("CLimitList[",i,"]");
        this.limitList[i].printMe();
    }




    // initial velocity in meters/sec.
    // adjust by ++Start, --Start buttons. Original value 
    // was 0.15 meters per timestep; multiply by 60 to get meters per second.
    this.INIT_VEL =  0.15 * 60.0;

    // units-free air-drag (scales velocity); adjust by d/D keys
    this.drag = 0.985;
    // gravity's acceleration(meter/sec^2); adjust by g/G keys
    this.grav = 9.832;
    // units-free 'Coefficient of Restitution'
    this.resti = 0.9;




    // Initialize Particle System Controls:

    // Master Control: 0=reset; 1= pause; 2=step; 3=run
    this.runMode =  3;
    // adjust by s/S keys
    this.solvType = Solver.Midpoint;
    // floor-bounce constraint type:
    // ==0 for velocity-reversal, as in all previous versions
    // ==1 for Chapter 3's collision resolution method, which uses
    // an 'impulse' to cancel any velocity boost caused by falling below the floor
    this.bounceType = 1;



    
    // Create and fill VBO with state s1 contents:

    // make a tetrahedron spring system:
    // center of tetrahedron base
    var c_x = 0.0;
    var c_y = 5.0;
    var c_z = 5.0;

    // i = particle number; j = array index for i-th particle
    var j = 0;
    for (var i1 = 0; i1 < count1; i1++)
    {
        for (var j1 = 0; j1 < count2; j1++)
        {
            this.s1[j + Properties.position.x] = j1;
            this.s1[j + Properties.position.y] = c_y;
            this.s1[j + Properties.position.z] = -i1;
            this.s1[j + Properties.position.w] = 1.0;
            // harcoded velocities for now
            this.s1[j + Properties.velocity.x] =  0.0;
            this.s1[j + Properties.velocity.y] =  0.0;
            this.s1[j + Properties.velocity.z] =  0.0;
            // give initial color to the particles
            this.s1[j + Properties.color.r] = 0.9;
            this.s1[j + Properties.color.g] = 0.9;
            this.s1[j + Properties.color.b] = 0.9;
            this.s1[j + Properties.color.a] =  1.0;
            // mass, in kg.
            this.s1[j + Properties.mass] =  1.0;
            // on-screen diameter, in pixels (not used as of now for spring system)
            this.s1[j + Properties.diameter] =  2.0 + 10*Math.random();
            this.s1[j + Properties.renderMode] = 0.0;
            this.s1[j + Properties.age] = 30 + 100*Math.random();

            j+= Properties.maxVariables;
        }
    }

    var Is = [0, 0];
    var Js = [-1, count2];
    for (var k = 0; k <2; k++)
    {
        var i1 = Is[k];
        var j1 = Js[k];
        this.s1[j + Properties.position.x] = j1;
        this.s1[j + Properties.position.y] = c_y;
        this.s1[j + Properties.position.z] = i1;
        this.s1[j + Properties.position.w] = 1.0;
        // harcoded velocities for now
        this.s1[j + Properties.velocity.x] =  0.0;
        this.s1[j + Properties.velocity.y] =  0.0;
        this.s1[j + Properties.velocity.z] =  0.0;
        // give initial color to the particles
        this.s1[j + Properties.color.r] = 0.5;
        this.s1[j + Properties.color.g] = 0.5;
        this.s1[j + Properties.color.b] = 0.5;
        this.s1[j + Properties.color.a] =  1.0;        
        // mass, in kg.
        this.s1[j + Properties.mass] =  1.0;
        // on-screen diameter, in pixels (not used as of now for spring system)
        this.s1[j + Properties.diameter] =  2.0 + 10*Math.random();
        this.s1[j + Properties.renderMode] = 0.0;
        this.s1[j + Properties.age] = 30 + 100*Math.random();

        j+= Properties.maxVariables;
    }


    // COPY contents of state-vector s1 to s2
    this.s2.set(this.s1);



    // create index buffer, vertex buffer and color buffer
    // required for the particle system rendering
    this.createVertexAndColorBuffers();
    this.createIndexBuffer();
}

PartSys.prototype.initReevesFire = function(count)
{
    console.log('PartSys.ReevesFire() initializing...');

    this.name = "Reeves Fire Particle System";

    // get the vertex and fragment shader strings
    var vsSource = document.getElementById("vertex-shader").textContent;
    var fsSource = document.getElementById("fragment-shader-balls").textContent;    
    this.program = createProgram(gl, vsSource, fsSource);
    if (!this.program) {
      console.log('Failed to create program');
      return false;
    }
    gl.useProgram(this.program);
    gl.program = this.program;
    this.programInfo = getAtrribsAndUniforms(gl);

    // Create all state-variables
    this.partCount = count;
    this.s1 =    new Float32Array(this.partCount * Properties.maxVariables);
    this.s2 =    new Float32Array(this.partCount * Properties.maxVariables);
    this.s1dot = new Float32Array(this.partCount * Properties.maxVariables);  
    // Float32Array objects are zero-filled by default
    // for midpoint solver:
    this.sM =    new Float32Array(this.partCount * Properties.maxVariables);
    this.sMdot = new Float32Array(this.partCount * Properties.maxVariables);

    // use fountain like effect for Reeves Fire
    this.isFountain = true;

    // Create force-causing objects:
    var fTmp = new CForcer();

    // earth gravity for all particles:
    fTmp.forceType = Forces.EarthGravity;
    // set it to affect ALL particles
    fTmp.targFirst = 0;
    // (negative value means ALL particles)
    fTmp.partCount = -1;
    // (and IGNORE all other Cforcer members...)
    // append this to the forceList array of force-causing objects
    this.forceList.push(fTmp);

    // drag for all particles:
    fTmp = new CForcer();
    // Viscous Drag
    fTmp.forceType = Forces.Drag;
    // in Euler solver, scales velocity by 0.85
    fTmp.Kdrag = 0.15;
    // apply it to ALL particles
    fTmp.targFirst = 0;
    // negative value means ALL particles
    fTmp.partCount = -1;
    // (and IGNORE all other Cforcer members...)
    // append this to the forceList array of force-causing objects
    this.forceList.push(fTmp);

    // Report:
    console.log("PartSys.initBouncy2D() created PartSys.forceList[] array of ");
    console.log("\t\t", this.forceList.length, "CForcer objects:");
    for(i=0; i<this.forceList.length; i++)
    {
        console.log("CForceList[",i,"]");
        this.forceList[i].printMe();
    }




    // Create constraint-causing objects:
    var cTmp = new CLimit();
    // set how particles 'bounce' from its surface
    cTmp.hitType = HitType.BounceVelocityReversal;
    // confine particles inside axis-aligned rectangular volume
    cTmp.limitType = LimitType.Volume;
    // applies to ALL particles; starting at 0
    cTmp.targFirst = 0;
    // through all the rest of them
    cTmp.partCount = -1;
    // box extent:  +/- 1.0 box at origin
    cTmp.xMin = 0.0; cTmp.xMax = 20.0;
    cTmp.yMin = 0.0; cTmp.yMax = 20.0;
    cTmp.zMin = 0.0; cTmp.zMax = 20.0;
    // bouncyness: coeff. of restitution.
    cTmp.Kresti = 1.0;
    // (and IGNORE all other CLimit members...)
    // append this to array of constraint-causing objects
    this.limitList.push(cTmp);

    // Report:
    console.log("PartSys.initBouncy2D() created PartSys.limitList[] array of ");
    console.log("\t\t", this.limitList.length, "CLimit objects.");
    for(i=0; i<this.limitList.length; i++)
    {
        console.log("CLimitList[",i,"]");
        this.limitList[i].printMe();
    }




    // initial velocity in meters/sec.
    // adjust by ++Start, --Start buttons. Original value 
    // was 0.15 meters per timestep; multiply by 60 to get meters per second.
    this.INIT_VEL =  0.15 * 60.0;

    // units-free air-drag (scales velocity); adjust by d/D keys
    this.drag = 0.985;
    // gravity's acceleration(meter/sec^2); adjust by g/G keys
    this.grav = 9.832;
    // units-free 'Coefficient of Restitution'
    this.resti = 1.0;




    // Initialize Particle System Controls:

    // Master Control: 0=reset; 1= pause; 2=step; 3=run
    this.runMode =  3;
    // adjust by s/S keys
    this.solvType = Solver.OldGood;
    // floor-bounce constraint type:
    // ==0 for velocity-reversal, as in all previous versions
    // ==1 for Chapter 3's collision resolution method, which uses
    // an 'impulse' to cancel any velocity boost caused by falling below the floor
    this.bounceType = 1;



    
    // Create and fill VBO with state s1 contents:

    // i = particle number; j = array index for i-th particle
    var j = 0;
    for (var i = 0; i < this.partCount; i += 1, j+= Properties.maxVariables)
    {
        // set this.randX,randY,randZ to random location in
        // a 3D unit sphere centered at the origin
        this.roundRand();
        // all our bouncy-balls stay within a +/- 0.9 cube centered at origin; 
        // set random positions in a 0.1-radius ball centered at (0.8,0.8,0.8)
        this.s1[j + Properties.position.x] = 0.8 + 1.0*this.randX; 
        this.s1[j + Properties.position.y] = 0.8 + 1.0*this.randY;  
        this.s1[j + Properties.position.z] = 0.8 + 1.0*this.randZ;
        this.s1[j + Properties.position.w] =  1.0;

        // Now choose random initial velocities too:
        this.roundRand();
        this.s1[j + Properties.velocity.x] =  this.INIT_VEL*(0.0 + 0.2*this.randX);
        this.s1[j + Properties.velocity.y] =  this.INIT_VEL*(0.0 + 0.2*this.randY);
        this.s1[j + Properties.velocity.z] =  this.INIT_VEL*(0.4 + 0.2*this.randZ);

        // give initial color to the particles
        this.s1[j + Properties.color.r] = 1.0;
        this.s1[j + Properties.color.g] = 0.3;
        this.s1[j + Properties.color.b] = 0.0;
        this.s1[j + Properties.color.a] =  1.0;        
        
        // mass, in kg.
        this.s1[j + Properties.mass] =  1.0;
        // on-screen diameter, in pixels
        this.s1[j + Properties.diameter] =  2.0 + 10*Math.random();
        this.s1[j + Properties.renderMode] = 0.0;
        this.s1[j + Properties.age] = 20 + 5*Math.random();
    }
    // COPY contents of state-vector s1 to s2
    this.s2.set(this.s1);




    // create index buffer, vertex buffer and color buffer
    // required for the particle system rendering
    this.createVertexAndColorBuffers();
}

PartSys.prototype.initTornado = function(count)
{
    console.log('PartSys.Tornado() initializing...');

    this.name = "Tornado Particle System";

    // get the vertex and fragment shader strings
    var vsSource = document.getElementById("vertex-shader").textContent;
    var fsSource = document.getElementById("fragment-shader-balls-grad").textContent;    
    this.program = createProgram(gl, vsSource, fsSource);
    if (!this.program) {
      console.log('Failed to create program');
      return false;
    }
    gl.useProgram(this.program);
    gl.program = this.program;
    this.programInfo = getAtrribsAndUniforms(gl);

    // Create all state-variables
    this.partCount = count;
    this.s1 =    new Float32Array(this.partCount * Properties.maxVariables);
    this.s2 =    new Float32Array(this.partCount * Properties.maxVariables);
    this.s1dot = new Float32Array(this.partCount * Properties.maxVariables);  
    // Float32Array objects are zero-filled by default
    // for midpoint solver:
    this.sM =    new Float32Array(this.partCount * Properties.maxVariables);
    this.sMdot = new Float32Array(this.partCount * Properties.maxVariables);

    // use fountain like effect for Tornado (vanish particles after some time)
    this.isTornado = true;
    // this.isFountain = false;


    // Create force-causing objects:
    var fTmp = new CForcer();

    // earth gravity for all particles:
    fTmp.forceType = Forces.EarthGravity;
    // set it to affect ALL particles
    fTmp.targFirst = 0;
    // (negative value means ALL particles)
    fTmp.partCount = -1;
    // (and IGNORE all other Cforcer members...)
    // append this to the forceList array of force-causing objects
    this.forceList.push(fTmp);

    // drag for all particles:
    fTmp = new CForcer();
    // Viscous Drag
    fTmp.forceType = Forces.Drag;
    // in Euler solver, scales velocity by 0.85
    fTmp.Kdrag = 0.15;
    // apply it to ALL particles
    fTmp.targFirst = 0;
    // negative value means ALL particles
    fTmp.partCount = -1;
    // (and IGNORE all other Cforcer members...)
    // append this to the forceList array of force-causing objects
    this.forceList.push(fTmp);

    // drag for all particles:
    fTmp = new CForcer();
    // Viscous Drag
    fTmp.forceType = Forces.Tornado;
    // in Euler solver, scales velocity by 0.85
    fTmp.Kdrag = 0.15;
    // apply it to ALL particles
    fTmp.targFirst = 0;
    // negative value means ALL particles
    fTmp.partCount = -1;
    // specify the tornado center
    this.TornadoCenter = new Vector4([0,0,0,1]);
    // range of the tornado
    tornadoRadius = 5.0;
    // height upto which Tornado will work
    tornadoHeight = 10.0;
    // (and IGNORE all other Cforcer members...)
    // append this to the forceList array of force-causing objects

    this.forceList.push(fTmp);

    // Report:
    console.log("PartSys.initBouncy2D() created PartSys.forceList[] array of ");
    console.log("\t\t", this.forceList.length, "CForcer objects:");
    for(i=0; i<this.forceList.length; i++)
    {
        console.log("CForceList[",i,"]");
        this.forceList[i].printMe();
    }




    // Create constraint-causing objects:
    var cTmp = new CLimit();
    // set how particles 'bounce' from its surface
    cTmp.hitType = -1;//HitType.BounceVelocityReversal;
    // confine particles inside axis-aligned rectangular volume
    cTmp.limitType = LimitType.Volume;
    // applies to ALL particles; starting at 0
    cTmp.targFirst = 0;
    // through all the rest of them
    cTmp.partCount = -1;
    // box extent:  +/- 1.0 box at origin
    cTmp.xMin = -10.0; cTmp.xMax = 10.0;
    cTmp.yMin = -10.0; cTmp.yMax = 10.0;
    cTmp.zMin = 0.0; cTmp.zMax = 15.0;
    this.xMin = -10.0; this.xMax = 10.0;
    this.yMin = -10.0; this.yMax = 10.0;
    this.zMin = 0.0; this.zMax = 15.0;
    // bouncyness: coeff. of restitution.
    cTmp.Kresti = 1.0;
    // (and IGNORE all other CLimit members...)
    // append this to array of constraint-causing objects
    this.limitList.push(cTmp);

    // Report:
    console.log("PartSys.initBouncy2D() created PartSys.limitList[] array of ");
    console.log("\t\t", this.limitList.length, "CLimit objects.");
    for(i=0; i<this.limitList.length; i++)
    {
        console.log("CLimitList[",i,"]");
        this.limitList[i].printMe();
    }




    // initial velocity in meters/sec.
    // adjust by ++Start, --Start buttons. Original value 
    // was 0.15 meters per timestep; multiply by 60 to get meters per second.
    this.INIT_VEL =  0.15 * 60.0;

    // units-free air-drag (scales velocity); adjust by d/D keys
    this.drag = 0.985;
    // gravity's acceleration(meter/sec^2); adjust by g/G keys
    this.grav = 9.832;
    // units-free 'Coefficient of Restitution'
    this.resti = 1.0;




    // Initialize Particle System Controls:

    // Master Control: 0=reset; 1= pause; 2=step; 3=run
    this.runMode =  3;
    // adjust by s/S keys
    this.solvType = Solver.Midpoint;
    // floor-bounce constraint type:
    // ==0 for velocity-reversal, as in all previous versions
    // ==1 for Chapter 3's collision resolution method, which uses
    // an 'impulse' to cancel any velocity boost caused by falling below the floor
    this.bounceType = 0;



    
    // Create and fill VBO with state s1 contents:

    // i = particle number; j = array index for i-th particle
    var j = 0;
    for (var i = 0; i < this.partCount; i += 1, j+= Properties.maxVariables)
    {
        // set this.randX,randY,randZ to random location in
        // a 3D unit sphere centered at the origin
        this.roundRand();
        // all our bouncy-balls stay within a +/- 0.9 cube centered at origin; 
        // set random positions in a 0.1-radius ball centered at (0.8,0.8,0.8)
        this.s1[j + Properties.position.z] = 1.5 + 1.5*this.randZ;
        this.s1[j + Properties.position.x] = 0.0 + this.s1[Properties.position.z]*this.randX; 
        this.s1[j + Properties.position.y] = 0.0 + this.s1[Properties.position.z]*this.randY;  
        this.s1[j + Properties.position.w] =  1.0;

        // Now choose random initial velocities too:
        this.roundRand();
        this.s1[j + Properties.velocity.x] =  this.INIT_VEL*(0.2*this.randX);
        this.s1[j + Properties.velocity.y] =  this.INIT_VEL*(0.2*this.randY);
        this.s1[j + Properties.velocity.z] =  this.INIT_VEL*(0.2);// + 0.2*this.randZ);

        // give initial color to the particles
        this.s1[j + Properties.color.r] = 0.5;
        this.s1[j + Properties.color.g] = 0.5;
        this.s1[j + Properties.color.b] = 0.5;
        this.s1[j + Properties.color.a] =  1.0;

        // mass, in kg.
        this.s1[j + Properties.mass] =  1.0;
        // on-screen diameter, in pixels
        this.s1[j + Properties.diameter] =  2.0 + 10*Math.random();
        this.s1[j + Properties.renderMode] = 0.0;
        this.s1[j + Properties.age] = 50 + 50*Math.random();
    }
    // COPY contents of state-vector s1 to s2
    this.s2.set(this.s1);




    // create index buffer, vertex buffer and color buffer
    // required for the particle system rendering
    this.createVertexAndColorBuffers();
}

PartSys.prototype.initBoids = function(count)
{
    console.log('PartSys.Boids() initializing...');

    this.name = "Boids Particle System";

    // get the vertex and fragment shader strings
    var vsSource = document.getElementById("vertex-shader").textContent;
    var fsSource = document.getElementById("fragment-shader").textContent;    
    this.program = createProgram(gl, vsSource, fsSource);
    if (!this.program) {
      console.log('Failed to create program');
      return false;
    }
    gl.useProgram(this.program);
    gl.program = this.program;
    this.programInfo = getAtrribsAndUniforms(gl);

    // Create all state-variables
    this.partCount = count;
    this.s1 =    new Float32Array(this.partCount * Properties.maxVariables);
    this.s2 =    new Float32Array(this.partCount * Properties.maxVariables);
    this.s1dot = new Float32Array(this.partCount * Properties.maxVariables);  
    // for midpoint solver:
    this.sM =    new Float32Array(this.partCount * Properties.maxVariables);
    this.sMdot = new Float32Array(this.partCount * Properties.maxVariables);
    // Float32Array objects are zero-filled by default

    // Create force-causing objects:
    var fTmp = new CForcer();
    // fTmp = new CForcer();
    // Boids (Flocking )
    fTmp.forceType = Forces.Flocking;
    // in Euler solver, scales velocity by 0.85
    // fTmp.Kdrag = 0.15;
    // apply it to ALL particles
    fTmp.targFirst = 0;
    // negative value means ALL particles
    fTmp.partCount = -1;
    // (and IGNORE all other Cforcer members...)
    // append this to the forceList array of force-causing objects

    this.forceList.push(fTmp);

    // specify the scaling factor for all the rules of boids sytem
    this.scalingBoid = {
        Cohesive:  0.5,
        Repulsive: 0.2,
        Velocity:  1.0,
        Obstacle:  0.1,
    }

    // specify how much neighbourhood to account for while simulation
    this.flockNb = {
        Cohesive:  15,
        Repulsive: 10,
        Velocity:  15,
        Obstacle:  10,
    }

    // define obstacle position:
    this.obstPos = {
        x: 0,
        y: 0,
        z: 0,
    }

    // Report:
    console.log("PartSys.initBouncy2D() created PartSys.forceList[] array of ");
    console.log("\t\t", this.forceList.length, "CForcer objects:");
    for(i=0; i<this.forceList.length; i++)
    {
        console.log("CForceList[",i,"]");
        this.forceList[i].printMe();
    }




    // Create constraint-causing objects:
    var cTmp = new CLimit();
    // set how particles 'bounce' from its surface
    cTmp.hitType = -1;//HitType.BounceVelocityReversal;
    // confine particles inside axis-aligned rectangular volume
    cTmp.limitType = LimitType.VolumeWrap;
    // applies to ALL particles; starting at 0
    cTmp.targFirst = 0;
    // through all the rest of them
    cTmp.partCount = -1;
    // box extent:  +/- 1.0 box at origin
    cTmp.xMin = this.xMin = -20.0;
    cTmp.xMax = this.xMax = 20.0;
    cTmp.yMin = this.yMin = -10.0;
    cTmp.yMax = this.yMax = 10.0;
    cTmp.zMin = this.zMin = -10.0;
    cTmp.zMax = this.zMax = 10.0;

    // (and IGNORE all other CLimit members...)
    // append this to array of constraint-causing objects
    this.limitList.push(cTmp);

    // Report:
    console.log("PartSys.initBouncy2D() created PartSys.limitList[] array of ");
    console.log("\t\t", this.limitList.length, "CLimit objects.");
    for(i=0; i<this.limitList.length; i++)
    {
        console.log("CLimitList[",i,"]");
        this.limitList[i].printMe();
    }


    // initial velocity in meters/sec.
    // adjust by ++Start, --Start buttons. Original value 
    // was 0.15 meters per timestep; multiply by 60 to get meters per second.
    this.INIT_VEL =  0.15 * 60.0;

    // units-free air-drag (scales velocity); adjust by d/D keys
    this.drag = 0.985;
    // gravity's acceleration(meter/sec^2); adjust by g/G keys
    this.grav = 9.832;
    // units-free 'Coefficient of Restitution'
    this.resti = 1.0;




    // Initialize Particle System Controls:

    // Master Control: 0=reset; 1= pause; 2=step; 3=run
    this.runMode =  3;
    // adjust by s/S keys
    this.solvType = Solver.Midpoint;
    // floor-bounce constraint type:
    // ==0 for velocity-reversal, as in all previous versions
    // ==1 for Chapter 3's collision resolution method, which uses
    // an 'impulse' to cancel any velocity boost caused by falling below the floor
    this.bounceType = -1;



    
    // Create and fill VBO with state s1 contents:

    // i = particle number; j = array index for i-th particle
    var j = 0;
    for (var i = 0; i < this.partCount; i += 1, j+= Properties.maxVariables)
    {
        // set this.randX,randY,randZ to random location in
        // a 3D unit sphere centered at the origin
        this.roundRand();
        // all our bouncy-balls stay within a +/- 0.9 cube centered at origin; 
        // set random positions in a 0.1-radius ball centered at (0.8,0.8,0.8)
        this.s1[j + Properties.position.x] = 5 + 5*this.randX; 
        this.s1[j + Properties.position.y] = 5 + 5*this.randY;  
        this.s1[j + Properties.position.z] = 5 + 5*this.randZ;
        this.s1[j + Properties.position.w] =  1.0;

        // Now choose random initial velocities too:
        this.roundRand();
        this.s1[j + Properties.velocity.x] =  this.INIT_VEL*(-1.0 +0.5*this.randX);
        this.s1[j + Properties.velocity.y] =  this.INIT_VEL*(0.05*this.randY);
        this.s1[j + Properties.velocity.z] =  this.INIT_VEL*(0.05*this.randZ);

        // give initial color to the particles
        this.s1[j + Properties.color.r] = 1.0;
        this.s1[j + Properties.color.g] = 1.0;
        this.s1[j + Properties.color.b] = 0.0;
        this.s1[j + Properties.color.a] =  1.0;

        // mass, in kg.
        this.s1[j + Properties.mass] =  1.0;
        // on-screen diameter, in pixels
        this.s1[j + Properties.diameter] =  2.0 + 10*Math.random();
        this.s1[j + Properties.renderMode] = 0.0;
        this.s1[j + Properties.age] = 50 + 50*Math.random();
    }
    // COPY contents of state-vector s1 to s2
    this.s2.set(this.s1);




    // create index buffer, vertex buffer and color buffer
    // required for the particle system rendering
    this.createVertexAndColorBuffers();
}

PartSys.prototype.initFallingParts = function(count)
{
    console.log('PartSys.FallingParts() initializing...');

    this.name = "Falling Particles System";

    // get the vertex and fragment shader strings
    var vsSource = document.getElementById("vertex-shader").textContent;
    var fsSource = document.getElementById("fragment-shader-balls").textContent;    
    this.program = createProgram(gl, vsSource, fsSource);
    if (!this.program) {
      console.log('Failed to create program');
      return false;
    }
    gl.useProgram(this.program);
    gl.program = this.program;
    this.programInfo = getAtrribsAndUniforms(gl);

    // Create all state-variables
    this.partCount = count;
    this.s1 =    new Float32Array(this.partCount * Properties.maxVariables);
    this.s2 =    new Float32Array(this.partCount * Properties.maxVariables);
    this.s1dot = new Float32Array(this.partCount * Properties.maxVariables);  
    // for midpoint solver:
    this.sM =    new Float32Array(this.partCount * Properties.maxVariables);
    this.sMdot = new Float32Array(this.partCount * Properties.maxVariables);    
    // Float32Array objects are zero-filled by default


    // Create force-causing objects:
    // earth gravity for all particles:
    var fTmp = new CForcer();
    fTmp.forceType = Forces.EarthGravity;
    // set it to affect ALL particles
    fTmp.targFirst = 0;
    // (negative value means ALL particles)
    fTmp.partCount = -1;
    // (and IGNORE all other Cforcer members...)
    // append this to the forceList array of force-causing objects
    this.forceList.push(fTmp);

    // Report:
    console.log("PartSys.initBouncy2D() created PartSys.forceList[] array of ");
    console.log("\t\t", this.forceList.length, "CForcer objects:");
    for(i=0; i<this.forceList.length; i++)
    {
        console.log("CForceList[",i,"]");
        this.forceList[i].printMe();
    }




    // Create constraint-causing objects:
    var cTmp = new CLimit();
    // set how particles 'bounce' from its surface
    cTmp.hitType = HitType.Slide;
    // confine particles inside axis-aligned rectangular volume
    cTmp.limitType = LimitType.VolumeWrap;
    // applies to ALL particles; starting at 0
    cTmp.targFirst = 0;
    // through all the rest of them
    cTmp.partCount = -1;
    // box extent:  +/- 10.0 box at origin
    cTmp.xMin = this.xMin = -12.0;
    cTmp.xMax = this.xMax = 12.0;
    cTmp.yMin = this.yMin = -12.0;
    cTmp.yMax = this.yMax = 12.0;
    cTmp.zMin = this.zMin = -12.0;
    cTmp.zMax = this.zMax = 12.0;

    // specify the scaling factor for all the rules of boids sytem
    this.PlaneParams = {
        xMin: -7.0,
        xMax: +7.0,
        yMin: -7.0,
        yMax: +7.0,
        z: 0.0,
    }
    // (and IGNORE all other CLimit members...)
    // append this to array of constraint-causing objects
    this.limitList.push(cTmp);

    // Report:
    console.log("PartSys.initBouncy2D() created PartSys.limitList[] array of ");
    console.log("\t\t", this.limitList.length, "CLimit objects.");
    for(i=0; i<this.limitList.length; i++)
    {
        console.log("CLimitList[",i,"]");
        this.limitList[i].printMe();
    }


    // initial velocity in meters/sec.
    // adjust by ++Start, --Start buttons. Original value 
    // was 0.15 meters per timestep; multiply by 60 to get meters per second.
    this.INIT_VEL =  0.15 * 60.0;

    // units-free air-drag (scales velocity); adjust by d/D keys
    this.drag = 0.985;
    // gravity's acceleration(meter/sec^2); adjust by g/G keys
    this.grav = 9.832;
    // units-free 'Coefficient of Restitution'
    this.resti = 1.0;




    // Initialize Particle System Controls:

    // Master Control: 0=reset; 1= pause; 2=step; 3=run
    this.runMode =  3;
    // adjust by s/S keys
    this.solvType = Solver.Midpoint;
    // ==0 for velocity-reversal, as in all previous versions
    // floor-bounce constraint type:
    // ==1 for Chapter 3's collision resolution method, which uses
    // an 'impulse' to cancel any velocity boost caused by falling below the floor
    this.bounceType = -1;



    
    // Create and fill VBO with state s1 contents:

    // i = particle number; j = array index for i-th particle
    var j = 0;
    for (var i = 0; i < this.partCount; i += 1, j+= Properties.maxVariables)
    {
        // set this.randX,randY,randZ to random location in
        // a 3D unit sphere centered at the origin
        this.roundRand();
        // all our bouncy-balls stay within a +/- 0.9 cube centered at origin; 
        // set random positions in a 0.1-radius ball centered at (0.8,0.8,0.8)
        this.s1[j + Properties.position.x] = 2*this.randX; 
        this.s1[j + Properties.position.y] = 2*this.randY;  
        this.s1[j + Properties.position.z] = 5 + 2*this.randZ;
        this.s1[j + Properties.position.w] =  1.0;

        // Now choose random initial velocities too:
        this.roundRand();
        this.s1[j + Properties.velocity.x] =  this.INIT_VEL*(0.8*this.randX);
        this.s1[j + Properties.velocity.y] =  this.INIT_VEL*(0.8*this.randY);
        this.s1[j + Properties.velocity.z] =  this.INIT_VEL*(0.0);// + 1.5*this.randZ);

        this.s1[j + Properties.color.r] = 1.0;
        this.s1[j + Properties.color.g] = 1.0;
        this.s1[j + Properties.color.b] = 1.0;
        this.s1[j + Properties.color.a] =  1.0;

        // mass, in kg.
        this.s1[j + Properties.mass] =  1.0;
        // on-screen diameter, in pixels
        this.s1[j + Properties.diameter] =  2.0 + 10*Math.random();
        this.s1[j + Properties.renderMode] = 0.0;
        this.s1[j + Properties.age] = 50 + 50*Math.random();
    }
    // COPY contents of state-vector s1 to s2
    this.s2.set(this.s1);



    // create index buffer, vertex buffer and color buffer
    // required for the particle system rendering
    this.createVertexAndColorBuffers();
}

/// utility functions:

PartSys.prototype.getProgramInfo = function()
{
    gl.useProgram(this.program);
    gl.program = this.program;
    return this.programInfo;
}

PartSys.prototype.createVertexAndColorBuffers = function()
{
    // Create, Bind, Write Vertex Buffer
    var vertexBuffer = gl.createBuffer();
    if (!vertexBuffer)
    {
        console.log('PartSys.init() Failed to create the VBO object in the GPU');
        return -1;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.s1, gl.DYNAMIC_DRAW);


    // Create Buffer, Bind to Color Buffer, Write Data
    var colorBuffer = gl.createBuffer();
    if (!colorBuffer)
    {
        console.log('Failed to create the color buffer object');
        return -1;
    }    
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.s1, gl.STATIC_DRAW);

    this.buffers = {
        vertex: vertexBuffer,
        color: colorBuffer,
    }
}

PartSys.prototype.createIndexBuffer = function()
{
    // Create Buffer, Bind to Index Buffer, Write Data
    this.indexBuffer = gl.createBuffer();
    if (!this.indexBuffer)
    {
        console.log('Failed to create the index buffer object');
        return -1;
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);        
}

PartSys.prototype.updateVBOContents = function()
{
    // 'float' size, in bytes.
    this.FSIZE = this.s1.BYTES_PER_ELEMENT;

    // CHANGE our VBO's contents:

    // Bind buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.vertex);

    // offset: # of bytes to skip at the start of the VBO before
    var offset = 0;
    gl.bufferSubData(gl.ARRAY_BUFFER, offset, this.s1)

    // Tell GLSL to fill the 'a_Position' attribute variable for each shader

    // # of values in this attrib, ex: (x,y,z,w) => 4
    var nAttributes = 4;
    // data type (usually gl.FLOAT)
    var dataType = gl.FLOAT;
    // use integer normalizing? (usually false)
    var bNormalize = false;
    // Stride: #bytes from 1st stored value to next 
    var stride = Properties.maxVariables * this.FSIZE;
    // Offiset; #bytes from start of buffer to the 1st attrib value to be used
    var offset = Properties.position.x * this.FSIZE;

    // specify the layout of the vertex buffer
    gl.vertexAttribPointer(
        this.programInfo.attribLocations.vertexPosition, 
        nAttributes,
        dataType, 
        bNormalize,
        stride,
        offset);
                                
    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);


    // Tell GLSL to fill the 'a_Color' attribute variable for each shader
    // Bind the buffer object to target (gl.ARRAY_BUFFER = colorBuffer)    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color);

    // offset: # of bytes to skip at the start of the VBO before
    var offset = 0;
    gl.bufferSubData(gl.ARRAY_BUFFER, offset, this.s1)

    // # of values in this attrib, ex: (r,g,b,w) => 4
    nAttributes = 4;
    dataType = gl.FLOAT;
    bNormalize = false;
    // Stride: #bytes from 1st stored value to next 
    stride = Properties.maxVariables * this.FSIZE;
    // Offiset; #bytes from start of buffer to the 1st attrib value to be used
    offset = Properties.color.r * this.FSIZE;

    // specify the layout of the vertex buffer       
    gl.vertexAttribPointer(
        this.programInfo.attribLocations.vertexColor,
        nAttributes,
        dataType,
        bNormalize,
        stride,
        offset);

    // Enable the assignment to a_Color variable
    gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexColor);

    // Indices ->

    // Tell WebGL which indices to use to index the vertices
    // will be null if no index buffer exists
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);
}

/// end of utility functions


PartSys.prototype.applyForces = function(s, fList)
{
    // Clear the force-accumulator vector for each particle in state-vector 's', 
    // then apply each force described in the collection of force-applying objects 
    // found in 'fList'.
    // (this function will simplify our too-complicated 'draw()' function)

    // To begin, CLEAR force-accumulators for all particles in state variable 's'
    // i = particle number; j = array index for i-th particle
    var j = 0;
    for(var i = 0; i < this.partCount; i += 1, j+= Properties.maxVariables)
    {
        s[j + Properties.force.x] = 0.0;
        s[j + Properties.force.y] = 0.0;
        s[j + Properties.force.z] = 0.0;
    }

    // then find and accumulate all forces applied to particles in state s:
    
    // for every CForcer in fList array,
    for(var k = 0; k < fList.length; k++)
    {
        // Invalid force? SKIP IT!
        // if forceType is F_NONE, or if forceType was
        // negated to (temporarily) disable the CForcer
        if(fList[k].forceType <=0)
        {
            continue;
        }

        // Most, but not all CForcer objects apply a force to many particles, and
        // the CForcer members 'targFirst' and 'targCount' tell us which ones:

        // *IF* targCount == 0, the CForcer applies ONLY to particle numbers e1,e2
        //          (e.g. the e1 particle begins at s[fList[k].e1 * Properties.maxVariables])
        // *IF* targCount < 0, apply the CForcer to 'targFirst' and all the rest
        //      of the particles that follow it in the state variable s.
        // *IF* targCount > 0, apply the CForcer to exactly 'targCount' particles,
        //      starting with particle number 'targFirst'

        // Begin by presuming targCount < 0;

        // First affected particle # in our state 's'
        var m = fList[k].targFirst;
        // Total number of particles in 's'
        var mmax = this.partCount;

        // ! Apply force to e1,e2 particles only!
        // don't let loop run; apply force to e1,e2 particles only.
        if(fList[k].targCount==0)
        {
            m=mmax=0;
        }
        // ?did CForcer say HOW MANY particles?
        else if(fList[k].targCount > 0)
        {
            // YES! force applies to 'targCount' particles starting with particle # m:
            var tmp = fList[k].targCount;
            // (but MAKE SURE mmax doesn't get larger)
            if(tmp < mmax) mmax = tmp;
            else console.log("\n\n!!PartSys.applyForces() index error!!\n\n");
        }
        // console.log("m:",m,"mmax:",mmax);
        
        // m and mmax are now correctly initialized; use them!  

        // what kind of force should we apply?
        switch(fList[k].forceType)
        {
            // Spring-like connection to mouse cursor
            case Forces.Mouse:
                console.log("PartSys.applyForces(), fList[",k,"].forceType:", 
                                        fList[k].forceType, "NOT YET IMPLEMENTED!!");
                break;
            // Earth-gravity pulls 'downwards' as defined by downDir
            case Forces.EarthGravity:
                // state var array index for particle # m
                var j = m * Properties.maxVariables;
                for(; m<mmax; m++, j += Properties.maxVariables)
                {
                    // for every part# from m to mmax-1,
                    // force from gravity = mass * gravConst * downDirection
                    s[j + Properties.force.x] += s[j + Properties.mass] * fList[k].gravConst * 
                    fList[k].downDir.elements[0];
                    s[j + Properties.force.y] += s[j + Properties.mass] * fList[k].gravConst * 
                    fList[k].downDir.elements[1];
                    s[j + Properties.force.z] += s[j + Properties.mass] * fList[k].gravConst * 
                    fList[k].downDir.elements[2];
                }
                break;
            // Planetary gravity between particle # e1 and e2.
            case Forces.PlanetaryGravity:
                console.log("PartSys.applyForces(), fList[",k,"].forceType:", 
                                        fList[k].forceType, "NOT YET IMPLEMENTED!!");
                break;
            // Blowing-wind-like force-field; function of 3D position
            case Forces.Wind:
                console.log("PartSys.applyForces(), fList[",k,"].forceType:", 
                                        fList[k].forceType, "NOT YET IMPLEMENTED!!");
                break;
            // Constant inward force (bub_force)to a 3D centerpoint
            case Forces.Bubble:
                // bub_ctr if particle is > bub_radius away from it.
                console.log("PartSys.applyForces(), fList[",k,"].forceType:", 
                                        fList[k].forceType, "NOT YET IMPLEMENTED!!");
                break;
            // Viscous drag: force = -K_drag * velocity.
            case Forces.Drag:
                var j = m*Properties.maxVariables;  // state var array index for particle # m
                for(; m<mmax; m++, j+=Properties.maxVariables)
                {
                    // for every particle# from m to mmax-1,
                    // force from gravity == mass * gravConst * downDirection
                    s[j + Properties.force.x] -= fList[k].K_drag * s[j + Properties.velocity.x]; 
                    s[j + Properties.force.y] -= fList[k].K_drag * s[j + Properties.velocity.y];
                    s[j + Properties.force.z] -= fList[k].K_drag * s[j + Properties.velocity.z];
                }
                break;
            case Forces.Spring:
                // state var array index for particle # k
                var k1 = fList[k].e1;
                var k2 = fList[k].e2;
                var j1 = k1 * Properties.maxVariables;
                var j2 = k2 * Properties.maxVariables;
                // force from spring = K_spring * (length change)
                // distance from spring center:
                var del_x = (s[j1 + Properties.position.x] - s[j2 + Properties.position.x]);
                var del_y = (s[j1 + Properties.position.y] - s[j2 + Properties.position.y]);
                var del_z = (s[j1 + Properties.position.z] - s[j2 + Properties.position.z]);
                
                // current spring length (dist between the two particles)
                var del_len = Math.sqrt(del_x*del_x + del_y*del_y + del_z*del_z);
                // Normalize del (direction of spring deformation)
                var del_len_inv = 1/del_len;
                del_x *= del_len_inv;
                del_y *= del_len_inv;
                del_z *= del_len_inv;

                // veloctiy of deformation:
                // it is difference in the velocities of the two particles
                // at both ends of the spring
                // But only the velocity components parallel to the spring
                // would contribute for spring velocity
                vel_spring_x = s[j1 + Properties.velocity.x] - s[j2 + Properties.velocity.x];
                vel_spring_y = s[j1 + Properties.velocity.y] - s[j2 + Properties.velocity.y];
                vel_spring_z = s[j1 + Properties.velocity.z] - s[j2 + Properties.velocity.z];

                // get the magnitude as that is required to calculate the spring damping
                //vel_spring = vel1_spring - vel2_spring;
                
                
                var deltaLen = fList[k].K_restLength - del_len;
                // force from spring = K_spring * (length change)
                // also apply spring damping

                s[j1 + Properties.force.x] += (fList[k].K_spring * (deltaLen * del_x)
                - (fList[k].K_springDamp * vel_spring_x));
                s[j1 + Properties.force.y] += (fList[k].K_spring * (deltaLen * del_y) 
                - (fList[k].K_springDamp * vel_spring_y));
                s[j1 + Properties.force.z] += (fList[k].K_spring * (deltaLen * del_z)
                - (fList[k].K_springDamp * vel_spring_z));

                s[j2 + Properties.force.x] -= (fList[k].K_spring * (deltaLen * del_x)
                - (fList[k].K_springDamp * vel_spring_x));
                s[j2 + Properties.force.y] -= (fList[k].K_spring * (deltaLen * del_y) 
                - (fList[k].K_springDamp * vel_spring_y));
                s[j2 + Properties.force.z] -= (fList[k].K_spring * (deltaLen * del_z)
                - (fList[k].K_springDamp * vel_spring_z));

                break;
            case Forces.Springset:
                console.log("PartSys.applyForces(), fList[",k,"].forceType:", 
                                        fList[k].forceType, "NOT YET IMPLEMENTED!!");
                break;
            case Forces.Charge:
                console.log("PartSys.applyForces(), fList[",k,"].forceType:", 
                                        fList[k].forceType, "NOT YET IMPLEMENTED!!");
                break;
            case Forces.Tornado:
                // console.log("Tornado.applyForces() called");
                var j = m*Properties.maxVariables;  // state var array index for particle # m
                for(; m<mmax; m++, j+=Properties.maxVariables)
                {
                    //console.log("Calculating force for particle number: "+m);

                    // first calculate the in vector (tangential vector for ith particle)
                    // this vector will be parallel to ground plane

                    var fLx = s[j + Properties.position.x] - this.TornadoCenter.elements[0];
                    var fLy = s[j + Properties.position.y] - this.TornadoCenter.elements[1];
                    var fLz = s[j + Properties.position.z] - this.TornadoCenter.elements[2];
                  
                    // Normalize f.
                    var rlf = 1 / Math.sqrt(fLx*fLx + fLy*fLy + fLz*fLz);
                    var fx = fLx/rlf;
                    var fy = fLy/rlf;
                    var fz = fLz/rlf;
                  
                    // Calculate cross product of f and up.
                    // This will give the direction of "in" vector for the particle
                    // (tangential vector for ith particle)
                    var inX = -(fy * upZ - fz * upY);
                    var inY = -(fz * upX - fx * upZ);
                    var inZ = -(fx * upY - fy * upX);

                    // Calculate cross product of in and f -> get the new "orthogonal"
                    // force field direction vector
                    var dirX = -(inY * fz - inZ * fy);
                    var dirY = -(inZ * fx - inX * fz);
                    var dirZ = -(inX * fy - inY * fx);
                
                    // distance from center line
                    var rad = Math.sqrt(fLx*fLx + fLy*fLy);
                    var hGround = Math.abs(fLz);

                    // calculate Force magnitude based on radius (distance from center line)
                    // and height (from ground)
                    if (rad >= fList[k].tornadoRadius)
                    {
                        // destroy particle
                        // (init parameters to use as a new particle)
                    }
                    // only for the equation used below for F_magnitude,
                    // I referred to the this link:
                    // https://www.cs.rpi.edu/~cutler/classes/advancedgraphics/S10/final_projects/coppola_tahara.pdf
                    var Fmag = (5 - 2*Math.log(rad + 1) + (hGround/fList[k].tornadoHeight) * 0.2);
                    // console.log("Fx: " + Fmag * dirX);
                    // console.log("Fy: " + Fmag * dirY);
                    // console.log("Fz: " + Fmag * dirZ);
                    s[j + Properties.force.x] += Fmag * dirX; 
                    s[j + Properties.force.y] += Fmag * dirY;
                    s[j + Properties.force.z] += Fmag * dirZ;

                    // add some radial force
                    s[j + Properties.force.x] -= 10*Fmag * fx;
                    s[j + Properties.force.y] -= 10*Fmag * fy;
                    
                }
                break;
            case Forces.Flocking:
                fList[k].applyBoidForces(s, this.flockNb, m, mmax, this.scalingBoid, this.obstPos);
                break;
            case Forces.Anchor:
                // state var array index for particle # m
                var j = m * Properties.maxVariables;
                for(; m<mmax; m++, j += Properties.maxVariables)
                {
                    // make the total force on these particles to be zero
                    s[j + Properties.force.x] = 0;
                    s[j + Properties.force.y] = 0;
                    s[j + Properties.force.z] = 0;
                }
                break;
            default:
                console.log("!!!ApplyForces() fList[",k,"] invalid forceType:", fList[k].forceType);
                break;
        }
    }
}

PartSys.prototype.dotFinder = function(dest, src)
{
    // fill the already-existing 'dest' variable (a float32array) with the 
    // time-derivative of given state 'src'

    // inverse mass
    var invMass;
    // i= particle number; j = array index for i-th particle
    var j = 0;
    for(var i = 0; i < this.partCount; i += 1, j+= Properties.maxVariables)
    {
        // position derivative = velocity
        dest[j + Properties.position.x] = src[j + Properties.velocity.x];
        dest[j + Properties.position.y] = src[j + Properties.velocity.y];
        dest[j + Properties.position.z] = src[j + Properties.velocity.z];
        // presume 'w' fixed at 1.0
        dest[j + Properties.position.w] = 0.0;

        // Use 'src' current force-accumulator's values (set by PartSys.applyForces())
        // to find acceleration.  As multiply is FAR faster than divide, do this:
        // F=ma, so a = F/m, or a = F(1/m);
        invMass = 1.0 / src[j + Properties.mass];
        dest[j + Properties.velocity.x] = src[j + Properties.force.x] * invMass; 
        dest[j + Properties.velocity.y] = src[j + Properties.force.y] * invMass;
        dest[j + Properties.velocity.z] = src[j + Properties.force.z] * invMass;
        
        // we don't know how force changes with time;
        // presume it stays constant during timestep.
        dest[j + Properties.force.x] = 0.0;
        dest[j + Properties.force.y] = 0.0;
        dest[j + Properties.force.z] = 0.0;

        // presume color doesn't change with time.
        dest[j + Properties.color.r] = 0.0;
        dest[j + Properties.color.g] = 0.0;
        dest[j + Properties.color.b] = 0.0;
        // presume mass doesn't change with time.
        dest[j + Properties.mass] = 0.0;
        dest[j + Properties.diameter] = 0.0;
        // presume these don't change either...   
        dest[j + Properties.renderMode] = 0.0;
        dest[j + Properties.age] = 0.0;
    }            
}

PartSys.prototype.render = function(s)
{
    // use the corresponding shader
    gl.useProgram(this.program);
    gl.program = this.program;

    // update and bind data to respective buffer objects
    // vertex, color, index
    this.updateVBOContents();


    /*// run/step/pause the particle system
    gl.uniform1i(this.u_runModeID, this.runMode);*/

    // Draw our VBO's new contents:
    // start drawing from this index in vertex array
    var nFirst = 0;
    // draw these many vertices.
    var vertexCount = this.partCount;
    // Draw just the ground-plane's vertices
    gl.drawArrays(gl.POINTS, nFirst, vertexCount);
    if (s==2)
    {
        // Indices ->

        // Tell WebGL which indices to use to index the vertices
        // will be null if no index buffer exists
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        
        // data type for indices
        const type = gl.UNSIGNED_SHORT;
        const offset = 0;
        gl.drawElements(gl.LINES, this.indexCount, type, offset);
        
    }
}

PartSys.prototype.solver = function()
{
    // Find next state s2 from current state s1 (and perhaps some related states
    // such as s1dot, sM, sMdot, etc.) by the numerical integration method chosen
    // by PartSys.solvType.
    switch(this.solvType)
    {
        // EXPLICIT or 'forward time' solver; Euler Method: s2 = s1 + h*s1dot
        case Solver.Euler:
            // for all elements in s1,s2,s1dot;
            for(var n = 0; n < this.s1.length; n++)
            {
                this.s2[n] = this.s1[n] + this.s1dot[n] * (g_timeStep * 0.001); 
            }
            break;
        case Solver.Midpoint:
            // first calculate sM (using half-step)
            for(var n = 0; n < this.s1.length; n++)
            {
                this.sM[n] = this.s1[n] + this.s1dot[n] * (g_timeStep/2.0 * 0.001);
            }
            // now calculate sMdot using dotFinder
            this.dotFinder(this.sMdot, this.sM);
            // now get s2 with full-step
            for(var n = 0; n < this.s1.length; n++)
            {
                this.s2[n] = this.s1[n] + this.sMdot[n] * (g_timeStep * 0.001);
            }
            break;
        // IMPLICIT or 'reverse time' solver
        // This category of solver is often better, more stable, but lossy
        case Solver.OldGood:
            // apply acceleration due to gravity to current velocity:
            // s2[velocity.z] -= g * (g_timestep in seconds)

            // i==particle number; j==array index for i-th particle
            var j = 0;
            for(var i = 0; i < this.partCount; i += 1, j+= Properties.maxVariables)
            {
                this.s2[j + Properties.velocity.z] -= this.grav*(g_timeStep*0.001);
                // apply drag: attenuate current velocity:
                this.s2[j + Properties.velocity.x] *= this.drag;
                this.s2[j + Properties.velocity.y] *= this.drag;
                this.s2[j + Properties.velocity.z] *= this.drag;
                // move our particle using current velocity:
                // must convert g_timeStep from milliseconds to seconds
                this.s2[j + Properties.position.x] += this.s2[j + Properties.velocity.x] * (g_timeStep * 0.001);
                this.s2[j + Properties.position.y] += this.s2[j + Properties.velocity.y] * (g_timeStep * 0.001); 
                this.s2[j + Properties.position.z] += this.s2[j + Properties.velocity.z] * (g_timeStep * 0.001); 
            }
            break;
        default:
            console.log('?!?! unknown solver: this.solvType==' + this.solvType);
            break;
    }
    return;
}

PartSys.prototype.doConstraints = function(limitList)
{
    // console.log("LimitList length: ", limitList.length);
    // console.log("Particle System type: ", this.name);

    // for every CLimit in limitList array,
    for(var k = 0; k < limitList.length; k++)
    {
        // what kind of force should we apply?
        switch(limitList[k].limitType)
        {
            case LimitType.None:
                console.log("No limit type applied");
                break;
            case LimitType.Volume:
                // console.log("Volume Limit applied");
                limitList[k].enforceLimitVolume(this.bounceType, this.partCount, this.drag, this.s1, this.s2);
                break;
            case LimitType.Ball:
                console.log("Ball constraint applied");
                break;
            case LimitType.Wall:
                console.log("Wall constraint applied");
                break;
            case LimitType.Disc:
                break;
            case LimitType.Box:
                limitList[k].enforceLimitBox(this.partCount, this.s1, this.s2);
                break;
            case LimitType.MatrixVolume:
                break;
            case LimitType.VolumeWrap:
                limitList[k].enforceLimitVolumeWrap(this.partCount, this.drag, this.s1, this.s2);
                break;
            case LimitType.Distance.Anchor:
                limitList[k].enforceAnchor(this.s1, this.s2);
                break;
            default:
                console.log("default option selected");
                break;
        }

        switch(limitList[k].hitType)
        {
            case HitType.Slide:
                limitList[k].enforceSlide(this.partCount, this.s1, this.s2, this.PlaneParams);
                break;
            default:
                console.log("default option selected");
                break;
        }
    }



    // Add age constraint
    
    // Fountain:

    // When particle age falls to zero, re-initialize
    // to re-launch from a randomized location with
    // a randomized velocity and randomized age.
    if(this.isFountain == 1)
    {
        // i==particle number; j==array index for i-th particle
        var j = 0;

        for(var i = 0; i < this.partCount; i += 1, j+= Properties.maxVariables)
        {
            // decrement lifetime
            this.s2[j + Properties.age] -= 1;
            this.s2[j + Properties.diameter] -= 0.05;

            // End of life: RESET this particle!    
            if(this.s2[j + Properties.age] <= 0) 
            {
                this.roundRand();       // set this.randX,randY,randZ to random location in 
                                        // a 3D unit sphere centered at the origin.
                //all our bouncy-balls stay within a +/- 0.9 cube centered at origin; 
                // set random positions in a 0.1-radius ball centered at (-0.8,-0.8,-0.8)
                this.s2[j + Properties.position.x] = 0.8 + 1.0*this.randX;
                this.s2[j + Properties.position.y] = 0.8 + 1.0*this.randY;
                this.s2[j + Properties.position.z] = 0.8 + 1.0*this.randZ;
                // position 'w' coordinate;
                this.s2[j + Properties.position.w] =  1.0;

                // Now choose random initial velocities too:
                this.roundRand();
                this.s2[j + Properties.velocity.x] =  (this.s2[j + Properties.position.x] - 0.8)*this.INIT_VEL*(0.0 + 0.2*this.randX);
                this.s2[j + Properties.velocity.y] =  (this.s2[j + Properties.position.y] - 0.8)*this.INIT_VEL*(0.0 + 0.2*this.randY);
                this.s2[j + Properties.velocity.z] =  this.INIT_VEL*(0.4 + 0.2*this.randZ);
                // mass, in kg.
                this.s2[j + Properties.mass] =  1.0;
                // on-screen diameter, in pixels
                this.s2[j + Properties.diameter] =  2.0 + 1*Math.random();
                this.s2[j + Properties.renderMode] = 0.0;
                this.s2[j + Properties.age] = 10 + 5*Math.random();
            }
        }
    }



    // Tornado:
    // When particle age falls to zero, re-initialize
    // to re-launch from a randomized location with
    // a randomized velocity and randomized age.
    // The randomizations are done in some specific manner though
    if(this.isTornado == true)
    {
        // i==particle number; j==array index for i-th particle
        var j = 0;

        for(var i = 0; i < this.partCount; i += 1, j+= Properties.maxVariables)
        {
            // Particle is outside the tornado operation area
            // destory and create a new one inside the range  
            bIsOutside = (this.s1[Properties.position.x] < (this.xMin+2)) ||
            (this.s2[Properties.position.x] > (this.xMax-2)) ||
            (this.s2[Properties.position.y] < (this.yMin+2)) ||
            (this.s2[Properties.position.y] > (this.yMax-2)) ||
            (this.s2[Properties.position.z] < (this.zMin+2)) ||
            (this.s2[Properties.position.z] > (this.zMax-2));

            console.log("isOutside? " + bIsOutside);
            console.log("position.x: " + this.s2[Properties.position.x]);
            console.log("position.y: " + this.s2[Properties.position.y]);
            console.log("position.z: " + this.s2[Properties.position.z]);

            if(bIsOutside)
            {
                // set this.randX,randY,randZ to random location in
                // a 3D unit sphere centered at the origin
                this.roundRand();
                // all our bouncy-balls stay within a +/- 0.9 cube centered at origin; 
                // set random positions in a 0.1-radius ball centered at (0.8,0.8,0.8)
                this.s2[j + Properties.position.z] = 2.0 + 1.5*this.randZ;
                this.s2[j + Properties.position.x] = this.s2[Properties.position.z]*this.randX; 
                this.s2[j + Properties.position.y] = this.s2[Properties.position.z]*this.randY;  
                this.s2[j + Properties.position.w] =  1.0;

                // Now choose random initial velocities too:
                this.roundRand();
                this.s2[j + Properties.velocity.x] =  0;//this.INIT_VEL*(0.2*this.randX);
                this.s2[j + Properties.velocity.y] =  0;//this.INIT_VEL*(0.2*this.randY);
                this.s2[j + Properties.velocity.z] =  0;//this.INIT_VEL*(0.2);// + 0.2*this.randZ);

                // mass, in kg.
                this.s2[j + Properties.mass] =  1.0;
                // on-screen diameter, in pixels
                this.s2[j + Properties.diameter] =  2.0 + 10*Math.random();
                this.s2[j + Properties.renderMode] = 0.0;
                this.s2[j + Properties.age] = 50 + 8*Math.random();
            }
        }
    }


}

PartSys.prototype.swap = function()
{
    // set values of s1 array to match s2 array.
    this.s1.set(this.s2);
}

// HELPER FUNCTIONS:

/**
 * Find a new 3D point chosen randomly and uniformly
 * inside a sphere of radius 1.0 centered at origin
 */
PartSys.prototype.roundRand = function()
{
    // Math.random() gives #s with uniform PDF between 0 and 1.
    do {
        // choose an equally-likely 2D point
        // within the +/-1 cube, but
        this.randX = 2.0*Math.random() -1.0;
        this.randY = 2.0*Math.random() -1.0;
        this.randZ = 2.0*Math.random() -1.0;
    }
    // is x,y,z outside sphere? try again!
    while (this.randX*this.randX + this.randY*this.randY + this.randZ*this.randZ >= 1.0);
}

PartSys.prototype.setModelViewMatrixCloth = function()
{
    // create and set the model view matrix

    // our viewing angle is such that the screen is x-z plane
    // and inside screen is +y-axis

    var modelViewMatrix = new Matrix4();
    
    modelViewMatrix.setIdentity();
    // translate cube
    modelViewMatrix.translate(0.0, 20.0, 10.0);
    // scale cube
    var s = 1.0;
    modelViewMatrix.scale(s, s, s);

    // Pass our current matrix to the vertex shaders:
	gl.uniformMatrix4fv(
        this.programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix.elements);
}

PartSys.prototype.setModelViewMatrixFallingParts = function()
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

PartSys.prototype.setModelViewMatrixBoids = function()
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

PartSys.prototype.setModelViewMatrixTornado = function()
{
    // create and set the model view matrix

    // our viewing angle is such that the screen is x-z plane
    // and inside screen is +y-axis

    var modelViewMatrix = new Matrix4();
    
    modelViewMatrix.setIdentity();
    // translate cube
    modelViewMatrix.translate(45.0, -35.0, 0.0);
    // scale cube
    var s = 2.0;
    modelViewMatrix.scale(s, s, s);

    // Pass our current matrix to the vertex shaders:
	gl.uniformMatrix4fv(
        this.programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix.elements);
}

PartSys.prototype.setModelViewMatrixReevesFire = function()
{
    // create and set the model view matrix

    // our viewing angle is such that the screen is x-z plane
    // and inside screen is +y-axis

    var modelViewMatrix = new Matrix4();
    
    modelViewMatrix.setIdentity();
    // translate cube
    modelViewMatrix.translate(-10.0, 10.0, 0.0);
    // scale cube
    var s = 2.0;
    modelViewMatrix.scale(s, s, s);

    // Pass our current matrix to the vertex shaders:
	gl.uniformMatrix4fv(
        this.programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix.elements);
}

PartSys.prototype.setModelViewMatrixSpringPair = function()
{
    // create and set the model view matrix

    // our viewing angle is such that the screen is x-z plane
    // and inside screen is +y-axis

    var modelViewMatrix = new Matrix4();
    
    modelViewMatrix.setIdentity();
    // translate cube
    modelViewMatrix.translate(0.0, 20.0, 0.0);
    // scale cube
    var s = 2.0;
    modelViewMatrix.scale(s, s, s);

    // Pass our current matrix to the vertex shaders:
	gl.uniformMatrix4fv(
        this.programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix.elements);
}

PartSys.prototype.setModelViewMatrixBouncy = function()
{
    // create and set the model view matrix

    // our viewing angle is such that the screen is x-z plane
    // and inside screen is +y-axis

    var modelViewMatrix = new Matrix4();
    
    modelViewMatrix.setIdentity();
    // translate cube
    modelViewMatrix.translate(0.0, 5.0, 0.0);
    // scale cube
    var s = 2.0;
    modelViewMatrix.scale(s, s, s);

    // Pass our current matrix to the vertex shaders:
	gl.uniformMatrix4fv(
        this.programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix.elements);
}