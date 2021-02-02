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
    },
    // mass, in kilograms
    mass: 13,
    // on-screen diameter (in pixels)
    diameter: 14,
    // on-screen appearance (square, round, or soft-round)
    renderMode: 15,
    // # of frame-times until re-initializing (Reeves Fire)
    age: 16,
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
    maxVariables: 17,
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
    
    // print out the properties and solver enums
    console.log(Properties);
    console.log(Solver);
}

PartSys.prototype.initBouncy2D = function(count)
{
    // Create all state-variables
    this.partCount = count;
    this.s1 =    new Float32Array(this.partCount * Properties.maxVariables);
    this.s2 =    new Float32Array(this.partCount * Properties.maxVariables);
    this.s1dot = new Float32Array(this.partCount * Properties.maxVariables);  
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
    cTmp.xMin = -1.0; cTmp.xMax = 1.0;
    cTmp.yMin = -1.0; cTmp.yMax = 1.0;
    cTmp.zMin = -1.0; cTmp.zMax = 1.0;
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
        // set random positions in a 0.1-radius ball centered at (-0.8,-0.8,-0.8)
        this.s1[j + Properties.position.x] = -0.8 + 0.1*this.randX; 
        this.s1[j + Properties.position.y] = -0.8 + 0.1*this.randY;  
        this.s1[j + Properties.position.z] = -0.8 + 0.1*this.randZ;
        this.s1[j + Properties.position.w] =  1.0;

        // Now choose random initial velocities too:
        this.roundRand();
        this.s1[j + Properties.velocity.x] =  this.INIT_VEL*(0.4 + 0.2*this.randX);
        this.s1[j + Properties.velocity.y] =  this.INIT_VEL*(0.4 + 0.2*this.randY);
        this.s1[j + Properties.velocity.z] =  this.INIT_VEL*(0.4 + 0.2*this.randZ);

        // mass, in kg.
        this.s1[j + Properties.mass] =  1.0;
        // on-screen diameter, in pixels
        this.s1[j + Properties.diameter] =  2.0 + 10*Math.random();
        this.s1[j + Properties.renderMode] = 0.0;
        this.s1[j + Properties.age] = 30 + 100*Math.random();
    }
    // COPY contents of state-vector s1 to s2
    this.s2.set(this.s1);




    // 'float' size, in bytes.
    this.FSIZE = this.s1.BYTES_PER_ELEMENT;

    // Create, Bind, Write

    // Create a vertex buffer object (VBO) in the graphics hardware: get its ID# 
    this.vboID = gl.createBuffer();
    if (!this.vboID)
    {
        console.log('PartSys.init() Failed to create the VBO object in the GPU');
        return -1;
    }

    // Bind buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboID);

    // Write data
    gl.bufferData(gl.ARRAY_BUFFER, this.s1, gl.DYNAMIC_DRAW);

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
        programInfo.attribLocations.vertexPosition, 
        nAttributes,
        dataType, 
        bNormalize,
        stride,
        offset);                                       
                                
    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
}

PartSys.prototype.initBouncy3D = function(count)
{ 
    console.log('PartSys.initBouncy3D() stub not finished!');
}

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
        //console.log("m:",m,"mmax:",mmax);
        
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
                console.log("PartSys.applyForces(), fList[",k,"].forceType:", 
                                        fList[k].forceType, "NOT YET IMPLEMENTED!!");
                break;
            case Forces.Springset:
                console.log("PartSys.applyForces(), fList[",k,"].forceType:", 
                                        fList[k].forceType, "NOT YET IMPLEMENTED!!");
                break;
            case Forces.Charge:
                console.log("PartSys.applyForces(), fList[",k,"].forceType:", 
                                        fList[k].forceType, "NOT YET IMPLEMENTED!!");
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
    // CHANGE our VBO's contents:

    // Bind buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboID);

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
        programInfo.attribLocations.vertexPosition, 
        nAttributes,
        dataType, 
        bNormalize,
        stride,
        offset);
                                
    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);


    /*// run/step/pause the particle system
    gl.uniform1i(this.u_runModeID, this.runMode);*/

    // Draw our VBO's new contents:
    // start drawing from this index in vertex array
    var nFirst = 0;
    // draw these many vertices.
    var vertexCount = this.partCount;
    // Draw just the ground-plane's vertices
	gl.drawArrays(gl.POINTS, nFirst, vertexCount);
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

PartSys.prototype.doConstraints = function(sNow, sNext, cList)
{
    // bounceType:
    // ==0 for velocity-reversal, as in all previous versions
    // ==1 for Chapter 3's collision resolution method, which uses

    if(this.bounceType==0)
    {
        // i==particle number; j==array index for i-th particle
        var j = 0;

        for(var i = 0; i < this.partCount; i += 1, j+= Properties.maxVariables)
        {
            // simple velocity-reversal:
            if(this.s2[j + Properties.position.x] < -0.9 && this.s2[j + Properties.velocity.x] < 0.0)
            {
                // bounce on left (-X) wall
                this.s2[j + Properties.velocity.x] = -this.resti * this.s2[j + Properties.velocity.x]; 
            }
            else if(this.s2[j + Properties.position.x] >  0.9 && this.s2[j + Properties.velocity.x] > 0.0)
            {		
                // bounce on right (+X) wall
                this.s2[j + Properties.velocity.x] = -this.resti * this.s2[j + Properties.velocity.x];
            }

            if (this.s2[j + Properties.position.y] < -0.9 && this.s2[j + Properties.velocity.y] < 0.0)
            {
                // bounce on near wall (-Y)
                this.s2[j + Properties.velocity.y] = -this.resti * this.s2[j + Properties.velocity.y];
            }
            else if (this.s2[j + Properties.position.y] >  0.9 && this.s2[j + Properties.velocity.y] > 0.0)
            {
                // bounce on far wall (+Y)
                   this.s2[j + Properties.velocity.y] = -this.resti * this.s2[j + Properties.velocity.y];
            }

            if (this.s2[j + Properties.position.z] < -0.9 && this.s2[j + Properties.velocity.z] < 0.0)
            {
                // bounce on floor (-Z)
                this.s2[j + Properties.velocity.z] = -this.resti * this.s2[j + Properties.velocity.z];
            }
            else if( this.s2[j + Properties.position.z] >  0.9 && this.s2[j + Properties.velocity.z] > 0.0)
            {
                // bounce on ceiling (+Z)
                this.s2[j + Properties.velocity.z] = -this.resti * this.s2[j + Properties.velocity.z];
            }
        
            // the floor and walls need this position-enforcing constraint as well
            // floor
            if(this.s2[j + Properties.position.z] < -0.9) this.s2[j + Properties.position.z] = -0.9;
            // ceiling
            else if (this.s2[j + Properties.position.z] >  0.9) this.s2[j + Properties.position.z] =  0.9;

            // near wall
            if (this.s2[j + Properties.position.y] < -0.9) this.s2[j + Properties.position.y] = -0.9;
            // far wall
            else if (this.s2[j + Properties.position.y] >  0.9) this.s2[j + Properties.position.y] =  0.9;
            
            // left wall
            if (this.s2[j + Properties.position.x] < -0.9) this.s2[j + Properties.position.x] = -0.9;
            // right wall
            else if (this.s2[j + Properties.position.x] >  0.9) this.s2[j + Properties.position.x] =  0.9;
        }
    }
    else if (this.bounceType==1)
    {
        // i==particle number; j==array index for i-th particle
        var j = 0;
        for(var i = 0; i < this.partCount; i += 1, j+= Properties.maxVariables)
        {
            //--------  left (-X) wall  ----------
            if( this.s2[j + Properties.position.x] < -0.9)
            {
                // collision!
                // 1) resolve contact: put particle at wall.
                this.s2[j + Properties.position.x] = -0.9;
                // 2a) undo velocity change:
                this.s2[j + Properties.velocity.x] = this.s1[j + Properties.velocity.x];
                // 2b) apply drag:
                this.s2[j + Properties.velocity.x] *= this.drag;
                // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
                // ATTENTION! VERY SUBTLE PROBLEM HERE!
                // need a velocity-sign test here that ensures the 'bounce' step will 
                // always send the ball outwards, away from its wall or floor collision. 
                if (this.s2[j + Properties.velocity.x] < 0.0)
                {
                    // need sign change--bounce!
                    this.s2[j + Properties.velocity.x] = -this.resti * this.s2[j + Properties.velocity.x];
                }
                else
                {
                    // sign changed-- don't need another.
                    this.s2[j + Properties.velocity.x] =  this.resti * this.s2[j + Properties.velocity.x];
                }
            }
            //--------  right (+X) wall  --------------------------------------------
            else if( this.s2[j + Properties.position.x] >  0.9)
            {
  		        // collision!
                this.s2[j + Properties.position.x] = 0.9; // 1) resolve contact: put particle at wall.
                // 2a) undo velocity change:
  			    this.s2[j + Properties.velocity.x] = this.s1[j + Properties.velocity.x];
                // 2b) apply drag:  
                this.s2[j + Properties.velocity.x] *= this.drag;
  		        // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
  			    // ATTENTION! VERY SUBTLE PROBLEM HERE! 
  			    // need a velocity-sign test here that ensures the 'bounce' step will 
  			    // always send the ball outwards, away from its wall or floor collision. 
                if(this.s2[j + Properties.velocity.x] > 0.0)
                {
                    // need sign change--bounce!
  			        this.s2[j + Properties.velocity.x] = -this.resti * this.s2[j + Properties.velocity.x];
                }
                else
                {
                    // sign changed-- don't need another.
                    this.s2[j + Properties.velocity.x] =  this.resti * this.s2[j + Properties.velocity.x];
                }
            }

            //--------  left (-Y) wall  ----------
            if( this.s2[j + Properties.position.y] < -0.9)
            {
                // collision!
                // 1) resolve contact: put particle at wall.
                this.s2[j + Properties.position.y] = -0.9;
                // 2a) undo velocity change:
                this.s2[j + Properties.velocity.y] = this.s1[j + Properties.velocity.y];
                // 2b) apply drag:
                this.s2[j + Properties.velocity.y] *= this.drag;
                // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
                // ATTENTION! VERY SUBTLE PROBLEM HERE!
                // need a velocity-sign test here that ensures the 'bounce' step will 
                // always send the ball outwards, away from its wall or floor collision. 
                if (this.s2[j + Properties.velocity.y] < 0.0)
                {
                    // need sign change--bounce!
                    this.s2[j + Properties.velocity.y] = -this.resti * this.s2[j + Properties.velocity.y];
                }
                else
                {
                    // sign changed-- don't need another.
                    this.s2[j + Properties.velocity.y] =  this.resti * this.s2[j + Properties.velocity.y];
                }
            }
            //--------  right (+Y) wall  --------------------------------------------
            else if( this.s2[j + Properties.position.y] >  0.9)
            {
  		        // collision!
                this.s2[j + Properties.position.y] = 0.9; // 1) resolve contact: put particle at wall.
                // 2a) undo velocity change:
  			    this.s2[j + Properties.velocity.y] = this.s1[j + Properties.velocity.y];
                // 2b) apply drag:  
                this.s2[j + Properties.velocity.y] *= this.drag;
  		        // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
  			    // ATTENTION! VERY SUBTLE PROBLEM HERE! 
  			    // need a velocity-sign test here that ensures the 'bounce' step will 
  			    // always send the ball outwards, away from its wall or floor collision. 
                if(this.s2[j + Properties.velocity.y] > 0.0)
                {
                    // need sign change--bounce!
  			        this.s2[j + Properties.velocity.y] = -this.resti * this.s2[j + Properties.velocity.y];
                }
                else
                {
                    // sign changed-- don't need another.
                    this.s2[j + Properties.velocity.y] =  this.resti * this.s2[j + Properties.velocity.y];
                }
            }

            //--------  left (-Z) wall  ----------
            if( this.s2[j + Properties.position.z] < -0.9)
            {
                // collision!
                // 1) resolve contact: put particle at wall.
                this.s2[j + Properties.position.z] = -0.9;
                // 2a) undo velocity change:
                this.s2[j + Properties.velocity.z] = this.s1[j + Properties.velocity.z];
                // 2b) apply drag:
                this.s2[j + Properties.velocity.z] *= this.drag;
                // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
                // ATTENTION! VERY SUBTLE PROBLEM HERE!
                // need a velocity-sign test here that ensures the 'bounce' step will 
                // always send the ball outwards, away from its wall or floor collision. 
                if (this.s2[j + Properties.velocity.z] < 0.0)
                {
                    // need sign change--bounce!
                    this.s2[j + Properties.velocity.z] = -this.resti * this.s2[j + Properties.velocity.z];
                }
                else
                {
                    // sign changed-- don't need another.
                    this.s2[j + Properties.velocity.z] =  this.resti * this.s2[j + Properties.velocity.z];
                }
            }
            //--------  right (+Z) wall  --------------------------------------------
            else if( this.s2[j + Properties.position.z] >  0.9)
            {
  		        // collision!
                this.s2[j + Properties.position.z] = 0.9; // 1) resolve contact: put particle at wall.
                // 2a) undo velocity change:
  			    this.s2[j + Properties.velocity.z] = this.s1[j + Properties.velocity.z];
                // 2b) apply drag:  
                this.s2[j + Properties.velocity.z] *= this.drag;
  		        // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
  			    // ATTENTION! VERY SUBTLE PROBLEM HERE! 
  			    // need a velocity-sign test here that ensures the 'bounce' step will 
  			    // always send the ball outwards, away from its wall or floor collision. 
                if(this.s2[j + Properties.velocity.z] > 0.0)
                {
                    // need sign change--bounce!
  			        this.s2[j + Properties.velocity.z] = -this.resti * this.s2[j + Properties.velocity.z];
                }
                else
                {
                    // sign changed-- don't need another.
                    this.s2[j + Properties.velocity.z] =  this.resti * this.s2[j + Properties.velocity.z];
                }
            }
        }
    }
    else
    {
        console.log('?!?! unknown constraint: PartSys.bounceType==' + this.bounceType);
        return;
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

            // End of life: RESET this particle!    
            if(this.s2[j + Properties.age] <= 0) 
            {
                this.roundRand();       // set this.randX,randY,randZ to random location in 
                                        // a 3D unit sphere centered at the origin.
                //all our bouncy-balls stay within a +/- 0.9 cube centered at origin; 
                // set random positions in a 0.1-radius ball centered at (-0.8,-0.8,-0.8)
                this.s2[j + Properties.position.x] = -0.0 + 0.2*this.randX; 
                this.s2[j + Properties.position.y] = -0.4 + 0.2*this.randY;  
                this.s2[j + Properties.position.z] = -0.0 + 0.2*this.randZ;
                // position 'w' coordinate;
                this.s2[j + Properties.position.w] =  1.0;

                // Now choose random initial velocities too:
                this.roundRand();
                this.s2[j + Properties.velocity.x] =  this.INIT_VEL*(0.0 + 0.2*this.randX);
                this.s2[j + Properties.velocity.y] =  this.INIT_VEL*(0.5 + 0.2*this.randY);
                this.s2[j + Properties.velocity.z] =  this.INIT_VEL*(0.0 + 0.2*this.randZ);
                // mass, in kg.
                this.s2[j + Properties.mass] =  1.0;
                // on-screen diameter, in pixels
                this.s2[j + Properties.diameter] =  2.0 + 10*Math.random();
                this.s2[j + Properties.renderMode] = 0.0;
                this.s2[j + Properties.age] = 30 + 100*Math.random();
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

PartSys.prototype.setModelViewMatrixPartSys = function()
{
    // create and set the model view matrix

    // our viewing angle is such that the screen is x-z plane
    // and inside screen is +y-axis

    var modelViewMatrix = new Matrix4();
    
    modelViewMatrix.setIdentity();
    // translate cube
    modelViewMatrix.translate(0.0, 10.0, 1.0);
    // scale cube
    modelViewMatrix.scale(1.0, 1.0, 1.0);

    // Pass our current matrix to the vertex shaders:
	gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix.elements);
}