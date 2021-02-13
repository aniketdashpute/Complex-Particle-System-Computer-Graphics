/*******************************************************************
* File: CLimiter.js
* Author: Aniket Dashpute
* Credits:
* Most of the code is starter code
* by Prof. Jack Tumblin, Northwestern University
*******************************************************************/

// Each 'CLimit' object contains a 'hitType' member variable whose value
// selects how particle(s) will respond to collisions with a constraint:

const HitType = {
    // re-set position to meet constraint, re-set velocity to zero
    Stop: 0,
    // remove all velocity in the surface-normal direction
    Slide: 1,
    // simple velocity reversal method
    BounceVelocityReversal: 2,
    // impulsive method that enables 'bouncy' particle
    // to come to rest on a floor
    BounceImpulsive: 3,
}

// Each 'CLimit' object contains a 'limitType' member variable whose value
// selects the kind of constraint that the object describes from these:

const LimitType = {
    // non-existent, disabled, or unused constraint object
    None: 0,
    // Keeps particles inside/outside the axis-aligned rectangular volume
    Volume: 1,
    // Keeps particles inside/outside the ellipsoid volume
    // that osculates ('kisses the walls') the axis-aligned volume
    Ball: 2,
    // Prevents particles from passing through a 2-sided
    // axis-aligned wall that is rectangular, flat/2D, zero thickness
    Wall: 3,
    // Prevents particles from passing through a 2-sided
    // axis-aligned ellipsoidal wall that is flat/2D, zero thickness
    Disc: 4,
    // Creates an axis-aligned rectangular 'box' made of zero-thickness
    // 'walls' that prevent particles from  passing though from either side
    Box: 5,
    // Matrix-transformed Limit Volume:
    // Orthonormal Matrix4 member 'poseMatrix' (translate, rotate only)
    // transforms 'world' drawing axes to our own 'pose' drawing axes
    MatrixVolume: 6,
    // Matrix-transformed Limit Ball:
    MatrixBall: 7,
    // Matrix-transformed Limit Wall, (recommend zMin=zMax=0)
    MatrixWall: 8,
    // Matrix-transformed LIM_DISC:(recommend zMin=zMax=0)
    MatrixDisc: 9,
    /**
    * CyinderVolume: 10,
    * CylinderSide: 11,
    * MatrixCylinderVolume: 12,
    * MatrixCylinderSide: 13,
    */
    VolumeWrap: 10,
    // Distance constraints:
    Distance:
    {
        // Keep specified particle(s) at world-space location
        Anchor: 11,
        // Limit specified particles(s) positions to stay
        // within xMin,xMax,yMin,yMax,yMin,zMax (for example,
        // xMin=0, xMax=1, yMin=yMax=5; zMin=zMax=3; would
        // allow particle to 'slide' along line segment in x.
        Slot: 12,
        // Connects 2 particles with fixed-length separation
        // between particles whose indices are held in e1,e2
        // (e.g. particles at pS0[e1] and pS0[e2] )
        Rod: 13,
        // Prevent 2 particles selected by members e1,e2 fro
        // separating by more than distance 'radMax';
        Rope: 14,
        // Prevent any particle in a set (targFirst,targCount)
        // from getting closer than 2*this.radius to any other
        // particle in that set, as if both particles were
        // hard solid spheres that can't pass thru each other.
        Radius: 13,
        // Keep constant sum-of-distances for 3 particles
        // A,B,Pivot:  ||A-Pivot||+||B-Pivot|| = dmax.
        Pulley: 16,
        // Max number of possible limitType values available
        maxVariables: 17,
   }   
}

function CLimit()
{
    // Constructor for a new 'limit' object -- a constraint-applying object.
    // initially no constraint at all.
    this.limitType = LimitType.None;
    // but set for impulsive collision/bounce
    this.hitType = HitType.BounceImpulsive;
    // if true, draw this constraint on-screen
    this.isVisible = true;
  
    // Coeff. of restoration for constraint surfaces:
    this.K_resti = 1.0;
  
    // Specify which particles are constrained by this CLimit object:
    // particle-number (count from 0 in state variable)
    // of the first particle constrained by this CLimit
    this.targFirst =  0;

    // Number of sequential particles in state variable
    // constrained by this CLimit object. To select ALL
    // particles from 'targFirst' on, set targCount < 0.
    // For pairs of particles chosen by e1,e2 below,
    // set targCount=0.                        
    this.targCount = -1;      
                            
    // particle-number (count from 0 in state variable)
    // of the 2 particles constrained by this CLimit.
    this.e1 = 0; this.e2 = 1;

    // define axis-aligned volume or box
    this.xMin = -1.0;   this.xMax = 1.0;
    this.yMin = -1.0;   this.yMax = 1.0;
    this.zMin = -1.0;   this.zMax = 1.0;

    // Orthonormal matrix (translate,rotate ONLY: NO SCALING!)
    // that transforms world drawing axes to 'pose' axes where 
    // we define 'wall' and other non-axis-aligned constraints.
    this.poseMatrix = new Matrix4();

    // hard/solid particle size imposed by by LimitType Radius
    this.radius = 1.0;
}

CLimit.prototype.printMe = function(opt_src)
{
    // Print relevant contents of a given CLimit object.
    console.log("------------CLimit Contents:----------");
        
    console.log("targFirst:", this.targFirst, "targCount:", this.targCount);

    switch(this.hitType)
    {
        case HitType.Stop:
            console.log("hitType: Stop");
            break;
        case HitType.Slide:
            console.log("hitType: Slide");
            break;
        case HitType.BounceVelocityReversal:
            console.log("hitType: BounceVelocityReversal");
            break;
        case HitType.BounceImpulsive:
            console.log("hitType: BounceImpulsive");
            break;
        default:
            console.log("***INVALID*** hitType value:", this.hitType);
            break;
    }
    
    
    var tmp =this.limitType;   
    if(tmp < 0)
    {
        console.log("limitType ***NEGATED***; CLimit object temporarily disabled!");
        tmp = -tmp;   // reverse sign so the switch statement will work.
    }
    
    switch(this.limitType)
    {
        case LimitType.None:
            console.log("limitType: None");
            break;
        case LimitType.Volume:
            console.log("limitType: Volume");
            console.log("(xMin,xMax):", this.xMin,", ", this.xMax,
                        "(yMin,yMax):", this.yMin,", ", this.yMax,
                        "(zMin,zMax):", this.zMin,", ", this.zMax);
            break;
        case LimitType.Ball:
            console.log("limitType: Ball");
            break;
        case LimitType.Wall:
            console.log("limitType: Wall");
            break;
        case LimitType.Disc:
            console.log("limitType: Disc");
            break;
        case LimitType.Box:
            console.log("limitType: Box");
            break;
        case LimitType.MatrixVolume:
            console.log("limitType: MatrixVolume");
            break;
        case LimitType.MatrixBall:
            console.log("limitType: MatrixBall");
            break;
        case LimitType.MatrixWall:
            console.log("limitType: MatrixWall");
            break;
        case LimitType.MatrixDisc:
            console.log("limitType: MatrixDisc");
            break;
        case LimitType.Distance.Anchor:
            console.log("limitType: Distance.Anchor");
            break;
        case LimitType.Distance.Slot:
            console.log("limitType: Distance.Slot");
            break;
        case LimitType.Distance.Rod:
            console.log("limitType: Distance.Rod");
            break;
        case LimitType.Distance.Rope:
            console.log("limitType: Distance.Rope");
            break;
        case LimitType.Distance.Radius:
            console.log("limitType: Distance.Radius");
            break;
        case LimitType.Distance.Pulley:
            console.log("limitType: Distance.Pulley");
            break;
        default:
            console.log("limitType: invalid value:", this.limitType);
            break;
    }
    console.log("..........................................");

}

CLimit.prototype.enforceLimitVolume = function(bounceType, partCount, drag, sPrev, sNow)
{
    // bounceType:
    // ==0 for velocity-reversal, as in all previous versions
    // ==1 for Chapter 3's collision resolution method, which uses

    K_resti = this.K_resti;

    if(bounceType==0)
    {
        // i==particle number; j==array index for i-th particle
        var j = 0;

        for(var i = 0; i < partCount; i += 1, j+= Properties.maxVariables)
        {
            // simple velocity-reversal:
            if(sNow[j + Properties.position.x] < (this.xMin+0.1) && sNow[j + Properties.velocity.x] < 0.0)
            {
                // bounce on left (-X) wall
                sNow[j + Properties.velocity.x] = -K_resti * sNow[j + Properties.velocity.x]; 
            }
            else if(sNow[j + Properties.position.x] >  (this.xMax-0.1) && sNow[j + Properties.velocity.x] > 0.0)
            {		
                // bounce on right (+X) wall
                sNow[j + Properties.velocity.x] = -K_resti * sNow[j + Properties.velocity.x];
            }

            if (sNow[j + Properties.position.y] < (this.yMin+0.1) && sNow[j + Properties.velocity.y] < 0.0)
            {
                // bounce on near wall (-Y)
                sNow[j + Properties.velocity.y] = -K_resti * sNow[j + Properties.velocity.y];
            }
            else if (sNow[j + Properties.position.y] >  (this.yMax-0.1) && sNow[j + Properties.velocity.y] > 0.0)
            {
                // bounce on far wall (+Y)
                   sNow[j + Properties.velocity.y] = -K_resti * sNow[j + Properties.velocity.y];
            }

            if (sNow[j + Properties.position.z] < (this.zMin+0.1) && sNow[j + Properties.velocity.z] < 0.0)
            {
                // bounce on floor (-Z)
                sNow[j + Properties.velocity.z] = -K_resti * sNow[j + Properties.velocity.z];
            }
            else if( sNow[j + Properties.position.z] >  (this.zMax-0.1) && sNow[j + Properties.velocity.z] > 0.0)
            {
                // bounce on ceiling (+Z)
                sNow[j + Properties.velocity.z] = -K_resti * sNow[j + Properties.velocity.z];
            }
        
            // the floor and walls need this position-enforcing constraint as well
            // floor
            if(sNow[j + Properties.position.z] < (this.zMin+0.1)) sNow[j + Properties.position.z] = (this.zMin+0.1);
            // ceiling
            else if (sNow[j + Properties.position.z] >  (this.zMax-0.1)) sNow[j + Properties.position.z] =  (this.zMax-0.1);

            // near wall
            if (sNow[j + Properties.position.y] < (this.yMin+0.1)) sNow[j + Properties.position.y] = (this.yMin+0.1);
            // far wall
            else if (sNow[j + Properties.position.y] >  (this.yMax-0.1)) sNow[j + Properties.position.y] =  (this.yMax-0.1);
            
            // left wall
            if (sNow[j + Properties.position.x] < (this.xMin+0.1)) sNow[j + Properties.position.x] = (this.xMin+0.1);
            // right wall
            else if (sNow[j + Properties.position.x] >  (this.xMax-0.1)) sNow[j + Properties.position.x] =  (this.xMax-0.1);
        }
    }
    else if (bounceType==1)
    {
        // i==particle number; j==array index for i-th particle
        var j = 0;
        for(var i = 0; i < partCount; i += 1, j+= Properties.maxVariables)
        {
            //--------  left (-X) wall  ----------
            if( sNow[j + Properties.position.x] < (this.xMin+0.1))
            {
                // collision!
                // 1) resolve contact: put particle at wall.
                sNow[j + Properties.position.x] = (this.xMin+0.1);
                // 2a) undo velocity change:
                sNow[j + Properties.velocity.x] = sPrev[j + Properties.velocity.x];
                // 2b) apply drag:
                sNow[j + Properties.velocity.x] *= drag;
                // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
                // ATTENTION! VERY SUBTLE PROBLEM HERE!
                // need a velocity-sign test here that ensures the 'bounce' step will 
                // always send the ball outwards, away from its wall or floor collision. 
                if (sNow[j + Properties.velocity.x] < 0.0)
                {
                    // need sign change--bounce!
                    sNow[j + Properties.velocity.x] = -K_resti * sNow[j + Properties.velocity.x];
                }
                else
                {
                    // sign changed-- don't need another.
                    sNow[j + Properties.velocity.x] =  K_resti * sNow[j + Properties.velocity.x];
                }
            }
            //--------  right (+X) wall  --------------------------------------------
            else if( sNow[j + Properties.position.x] >  (this.xMax-0.1))
            {
  		        // collision!
                // 1) resolve contact: put particle at wall.
                sNow[j + Properties.position.x] = (this.xMax-0.1);
                // 2a) undo velocity change:
  			    sNow[j + Properties.velocity.x] = sPrev[j + Properties.velocity.x];
                // 2b) apply drag:  
                sNow[j + Properties.velocity.x] *= drag;
  		        // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
  			    // ATTENTION! VERY SUBTLE PROBLEM HERE! 
  			    // need a velocity-sign test here that ensures the 'bounce' step will 
  			    // always send the ball outwards, away from its wall or floor collision. 
                if(sNow[j + Properties.velocity.x] > 0.0)
                {
                    // need sign change--bounce!
  			        sNow[j + Properties.velocity.x] = -K_resti * sNow[j + Properties.velocity.x];
                }
                else
                {
                    // sign changed-- don't need another.
                    sNow[j + Properties.velocity.x] =  K_resti * sNow[j + Properties.velocity.x];
                }
            }

            //--------  left (-Y) wall  ----------
            if( sNow[j + Properties.position.y] < (this.yMin+0.1))
            {
                // collision!
                // 1) resolve contact: put particle at wall.
                sNow[j + Properties.position.y] = (this.yMin+0.1);
                // 2a) undo velocity change:
                sNow[j + Properties.velocity.y] = sPrev[j + Properties.velocity.y];
                // 2b) apply drag:
                sNow[j + Properties.velocity.y] *= drag;
                // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
                // ATTENTION! VERY SUBTLE PROBLEM HERE!
                // need a velocity-sign test here that ensures the 'bounce' step will 
                // always send the ball outwards, away from its wall or floor collision. 
                if (sNow[j + Properties.velocity.y] < 0.0)
                {
                    // need sign change--bounce!
                    sNow[j + Properties.velocity.y] = -K_resti * sNow[j + Properties.velocity.y];
                }
                else
                {
                    // sign changed-- don't need another.
                    sNow[j + Properties.velocity.y] =  K_resti * sNow[j + Properties.velocity.y];
                }
            }
            //--------  right (+Y) wall  --------------------------------------------
            else if( sNow[j + Properties.position.y] >  (this.yMax-0.1))
            {
  		        // collision!
                // 1) resolve contact: put particle at wall.
                sNow[j + Properties.position.y] = (this.yMax-0.1);
                // 2a) undo velocity change:
  			    sNow[j + Properties.velocity.y] = sPrev[j + Properties.velocity.y];
                // 2b) apply drag:  
                sNow[j + Properties.velocity.y] *= drag;
  		        // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
  			    // ATTENTION! VERY SUBTLE PROBLEM HERE! 
  			    // need a velocity-sign test here that ensures the 'bounce' step will 
  			    // always send the ball outwards, away from its wall or floor collision. 
                if(sNow[j + Properties.velocity.y] > 0.0)
                {
                    // need sign change--bounce!
  			        sNow[j + Properties.velocity.y] = -K_resti * sNow[j + Properties.velocity.y];
                }
                else
                {
                    // sign changed-- don't need another.
                    sNow[j + Properties.velocity.y] =  K_resti * sNow[j + Properties.velocity.y];
                }
            }

            //--------  left (-Z) wall  ----------
            if( sNow[j + Properties.position.z] < (this.zMin+0.1))
            {
                // collision!
                // 1) resolve contact: put particle at wall.
                sNow[j + Properties.position.z] = (this.zMin+0.1);
                // 2a) undo velocity change:
                sNow[j + Properties.velocity.z] = sPrev[j + Properties.velocity.z];
                // 2b) apply drag:
                sNow[j + Properties.velocity.z] *= drag;
                // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
                // ATTENTION! VERY SUBTLE PROBLEM HERE!
                // need a velocity-sign test here that ensures the 'bounce' step will 
                // always send the ball outwards, away from its wall or floor collision. 
                if (sNow[j + Properties.velocity.z] < 0.0)
                {
                    // need sign change--bounce!
                    sNow[j + Properties.velocity.z] = -K_resti * sNow[j + Properties.velocity.z];
                }
                else
                {
                    // sign changed-- don't need another.
                    sNow[j + Properties.velocity.z] =  K_resti * sNow[j + Properties.velocity.z];
                }
            }
            //--------  right (+Z) wall  --------------------------------------------
            else if( sNow[j + Properties.position.z] >  (this.zMax-0.1))
            {
  		        // collision!
                // 1) resolve contact: put particle at wall.
                sNow[j + Properties.position.z] = (this.zMax-0.1);
                // 2a) undo velocity change:
  			    sNow[j + Properties.velocity.z] = sPrev[j + Properties.velocity.z];
                // 2b) apply drag:  
                sNow[j + Properties.velocity.z] *= drag;
  		        // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
  			    // ATTENTION! VERY SUBTLE PROBLEM HERE! 
  			    // need a velocity-sign test here that ensures the 'bounce' step will 
  			    // always send the ball outwards, away from its wall or floor collision. 
                if(sNow[j + Properties.velocity.z] > 0.0)
                {
                    // need sign change--bounce!
  			        sNow[j + Properties.velocity.z] = -K_resti * sNow[j + Properties.velocity.z];
                }
                else
                {
                    // sign changed-- don't need another.
                    sNow[j + Properties.velocity.z] =  K_resti * sNow[j + Properties.velocity.z];
                }
            }
        }
    }
    else
    {
        console.log('?!?! unknown constraint: PartSys.bounceType==' + this.bounceType);
        return;
    }

    return{
        s1: sPrev,
        s2: sNow,
    }
}

CLimit.prototype.enforceLimitVolumeWrap = function(partCount, drag, sPrev, sNow)
{
    // bounceType:
    // ==0 for velocity-reversal, as in all previous versions
    // ==1 for Chapter 3's collision resolution method, which uses

    K_resti = this.K_resti;


    var Lx = (this.xMax - this.xMin);
    var Ly = (this.yMax - this.yMin);
    var Lz = (this.zMax - this.zMin);
    console.log("Lx: " + Lx + " Ly: " + Ly + " Lz: " + Lz);


    // i==particle number; j==array index for i-th particle
    var j = 0;
    for(var i = 0; i < partCount; i += 1, j+= Properties.maxVariables)
    {
        sNow[j + Properties.position.x] = (sNow[j + Properties.position.x] - this.xMin + Lx)%Lx + this.xMin;
        sNow[j + Properties.position.y] = (sNow[j + Properties.position.y] - this.yMin + Ly)%Ly + this.yMin;
        sNow[j + Properties.position.z] = (sNow[j + Properties.position.z] - this.zMin + Lz)%Lz + this.zMin;
        
        // if( sNow[j + Properties.position.x] < (this.xMin))
        // {
        //     sNow[j + Properties.position.x] = (sNow[j + Properties.position.x] - this.xMin + Lx) + this.xMin;
        // }
        // else if( sNow[j + Properties.position.x] >  (this.xMax))
        // {
        //     sNow[j + Properties.position.x] = Math.max(sNow[j + Properties.position.x] - Lx, this.xMin);
        // }

        // if( sNow[j + Properties.position.y] < (this.yMin))
        // {
        //     sNow[j + Properties.position.y] = Math.min(sNow[j + Properties.position.y] + Ly, this.yMax);
        // }
        // else if( sNow[j + Properties.position.y] >  (this.yMax))
        // {
        //     sNow[j + Properties.position.y] = Math.max(sNow[j + Properties.position.y] - Ly, this.yMin);
        // }

        // if( sNow[j + Properties.position.z] < (this.zMin))
        // {
        //     sNow[j + Properties.position.z] = Math.min(sNow[j + Properties.position.z] + Lz, this.zMax);
        // }
        // else if( sNow[j + Properties.position.z] >  (this.zMax))
        // {
        //     sNow[j + Properties.position.z] = Math.max(sNow[j + Properties.position.z] - Lz, this.zMin);
        // }
    }

    return{
        s1: sPrev,
        s2: sNow,
    }
}