///////////////////////////////////////////////////////////////////////////////////
// The MIT License (MIT)
//
// Copyright (c) 2017 Tarek Sherif
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
// IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
///////////////////////////////////////////////////////////////////////////////////

(function() {
    "use strict";

    /**
        Primary entry point to PicoGL. An app will store all parts of the WebGL
        state and manage draw calls.

        @class
        @prop {DOMElement} canvas The canvas on which this app drawing.
        @prop {WebGLRenderingContext} gl The WebGL context.
        @prop {number} width The width of the drawing surface.
        @prop {number} height The height of the drawing surface.
        @prop {boolean} floatRenderTargetsEnabled Whether the EXT_color_buffer_float extension is enabled.
        @prop {boolean} linearFloatTexturesEnabled Whether the OES_texture_float_linear extension is enabled.
        @prop {Object} currentState Tracked GL state.
        @prop {GLEnum} clearBits Current clear mask to use with clear().
        @prop {Timer} timer Rendering timer.
        @prop {number} cpuTime Time spent on CPU during last timing. Only valid if timerReady() returns true.
        @prop {number} gpuTime Time spent on GPU during last timing. Only valid if timerReady() returns true.
                Will remain 0 if extension EXT_disjoint_timer_query_webgl2 is unavailable.
    */
    PicoGL.App = function App(canvas, contextAttributes) {
        this.canvas = canvas;
        this.gl = canvas.getContext("webgl2", contextAttributes);
        this.width = this.gl.drawingBufferWidth;
        this.height = this.gl.drawingBufferHeight;
        this.currentDrawCalls = null;
        this.emptyFragmentShader = null;

        this.currentState = {
            program: null,
            vertexArray: null
        };

        this.clearBits = this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT;
        
        this.timer = new PicoGL.Timer(this.gl);
        this.cpuTime = 0;
        this.gpuTime = 0;

        this.floatRenderTargetsEnabled = false;
        this.linearFloatTexturesEnabled = false;
        
        this.gl.viewport(0, 0, this.width, this.height);
    };

    /**
        Set the clear mask bits to use when calling clear().
        E.g. app.clearMask(PicoGL.COLOR_BUFFER_BIT).

        @method
        @param {GLEnum} mask Bit mask of buffers to clear.
    */
    PicoGL.App.prototype.clearMask = function(mask) {
        this.clearBits = mask;

        return this;
    };

    /**
        Set the clear color.

        @method
        @param {number} r Red channel.
        @param {number} g Green channel.
        @param {number} b Blue channel.
        @param {number} a Alpha channel.
    */
    PicoGL.App.prototype.clearColor = function(r, g, b, a) {
        this.gl.clearColor(r, g, b, a);

        return this;
    };

    /**
        Clear the canvas

        @method
    */
    PicoGL.App.prototype.clear = function() {
        this.gl.clear(this.clearBits);

        return this;
    };

    /**
        Set the list of DrawCalls to use when calling draw().

        @method
        @param {Array} drawCallList Array of DrawCall objects.
        @see DrawCall
    */
    PicoGL.App.prototype.drawCalls = function(drawCallList) {
        this.currentDrawCalls = drawCallList;

        return this;
    };

    /**
        Bind a framebuffer to the WebGL context.

        @method
        @param {Framebuffer} framebuffer The Framebuffer object to bind.
        @see Framebuffer
    */
    PicoGL.App.prototype.framebuffer = function(framebuffer) {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer.framebuffer);
        this.gl.viewport(0, 0, framebuffer.width, framebuffer.height);

        return this;
    };

    /**
        Switch back to the default framebuffer (i.e. draw to the screen).

        @method
    */
    PicoGL.App.prototype.defaultFramebuffer = function() {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.viewport(0, 0, this.width, this.height);

        return this;
    };

    /**
        Set the depth range.

        @method
        @param {number} near Minimum depth value. 
        @param {number} far Maximum depth value.
    */
    PicoGL.App.prototype.depthRange = function(near, far) {
        this.gl.depthRange(near, far);

        return this;
    };

    /**
        Enable depth testing.

        @method
    */
    PicoGL.App.prototype.depthTest = function() {
        this.gl.enable(this.gl.DEPTH_TEST);

        return this;
    };

    /**
        Disable depth testing.

        @method
    */
    PicoGL.App.prototype.noDepthTest = function() {
        this.gl.disable(this.gl.DEPTH_TEST);

        return this;
    };

    /**
        Enable writing to the z buffer.

        @method
    */
    PicoGL.App.prototype.depthMask = function() {
        this.gl.depthMask(true);

        return this;
    };

    /**
        Disable writing to the z buffer.

        @method
    */
    PicoGL.App.prototype.noDepthMask = function() {
        this.gl.depthMask(false);

        return this;
    };

    /**
        Enable blending.

        @method
    */
    PicoGL.App.prototype.blend = function() {
        this.gl.enable(this.gl.BLEND);

        return this;
    };

    /**
        Disable blending

        @method
    */
    PicoGL.App.prototype.noBlend = function() {
        this.gl.disable(this.gl.BLEND);

        return this;
    };

    /**
        Enable rasterization step.

        @method
    */
    PicoGL.App.prototype.rasterize = function() {
        this.gl.disable(this.gl.RASTERIZER_DISCARD);

        return this;
    };

    /**
        Disable rasterization step.

        @method
    */
    PicoGL.App.prototype.noRasterize = function() {
        this.gl.enable(this.gl.RASTERIZER_DISCARD);

        return this;
    };

    /**
        Set the depth test function. E.g. app.depthFunc(PicoGL.LEQUAL).

        @method
        @param {GLEnum} func The depth testing function to use.
    */
    PicoGL.App.prototype.depthFunc = function(func) {
        this.gl.depthFunc(func);

        return this;
    };

    /**
        Set the blend function. E.g. app.blendFunc(PicoGL.ONE, PicoGL.ONE_MINUS_SRC_ALPHA).

        @method
        @param {GLEnum} src The source blending weight.
        @param {GLEnum} dest The destination blending weight.
    */
    PicoGL.App.prototype.blendFunc = function(src, dest) {
        this.gl.blendFunc(src, dest);

        return this;
    };

    /**
        Set the blend function, with separate weighting for color and alpha channels. 
        E.g. app.blendFuncSeparate(PicoGL.ONE, PicoGL.ONE_MINUS_SRC_ALPHA, PicoGL.ONE, PicoGL.ONE).

        @method
        @param {GLEnum} csrc The source blending weight for the RGB channels.
        @param {GLEnum} cdest The destination blending weight for the RGB channels.
        @param {GLEnum} asrc The source blending weight for the alpha channel.
        @param {GLEnum} adest The destination blending weight for the alpha channel.
    */
    PicoGL.App.prototype.blendFuncSeparate = function(csrc, cdest, asrc, adest) {
        this.gl.blendFuncSeparate(csrc, cdest, asrc, adest);

        return this;
    };

    /**
        Enable backface culling.

        @method
    */
    PicoGL.App.prototype.cullBackfaces = function() {
        this.gl.enable(this.gl.CULL_FACE);

        return this;
    };

    /**
        Disable backface culling.

        @method
    */
    PicoGL.App.prototype.drawBackfaces = function() {
        this.gl.disable(this.gl.CULL_FACE);

        return this;
    };

    /**
        Enable the EXT_color_buffer_float extension. Allows for creating float textures as
        render targets on FrameBuffer objects. E.g. app.createFramebuffer().colorTarget(0, PicoGL.FLOAT).

        @method
        @see Framebuffer
    */
    PicoGL.App.prototype.floatRenderTargets = function() {
        this.floatRenderTargetsEnabled = !!this.gl.getExtension("EXT_color_buffer_float");
        
        if (!this.floatRenderTargetsEnabled) {
            console.warn("Extension EXT_color_buffer_float unavailable. Cannot enable float textures.");
        }
        
        return this;
    };

    /**
        Enable the OES_texture_float_linear extension. Allows for linear blending on float textures.

        @method
        @see Framebuffer
    */
    PicoGL.App.prototype.linearFloatTextures = function() {
        this.linearFloatTexturesEnabled = !!this.gl.getExtension("OES_texture_float_linear");
        
        if (!this.linearFloatTexturesEnabled) {
            console.warn("Extension OES_texture_float_linear unavailable. Cannot enable float texture linear filtering.");
        }
        
        return this;
    };

    /**
        Read a pixel's color value from the canvas. Note that the RGBA values will be encoded 
        as 0-255.

        @method
        @param {number} x The x coordinate of the pixel.
        @param {number} y The y coordinate of the pixel.
        @param {Uint8Array} outColor 4-element Uint8Array to store the pixel's color.
    */
    PicoGL.App.prototype.readPixel = function(x, y, outColor) {
        this.gl.readPixels(x, y, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, outColor);

        return this;
    };

    /**
        Resize the drawing surface.

        @method
        @param {number} width The new canvas width.
        @param {number} height The new canvas height.
    */
    PicoGL.App.prototype.resize = function(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;

        this.width = this.gl.drawingBufferWidth;
        this.height = this.gl.drawingBufferHeight;
        this.gl.viewport(0, 0, this.width, this.height);    

        return this;
    };

    /**
        Create a program.

        @method
        @param {Shader|string} vertexShader Vertex shader object or source code.
        @param {Shader|string} fragmentShader Fragment shader object or source code.
        @param {Array} [xformFeedbackVars] Transform feedback varyings.
    */
    PicoGL.App.prototype.createProgram = function(vsSource, fsSource, xformFeedbackVars) {
        return new PicoGL.Program(this.gl, vsSource, fsSource, xformFeedbackVars);
    };

    /**
        Create a shader. Creating a shader separately from a program allows for 
        shader reuse.

        @method
        @param {GLEnum} type Shader type.
        @param {string} source Shader source.
    */
    PicoGL.App.prototype.createShader = function(type, source) {
        return new PicoGL.Shader(this.gl, type, source);
    };

    /**
        Create a vertex array.

        @method
    */
    PicoGL.App.prototype.createVertexArray = function() {
        return new PicoGL.VertexArray(this.gl);
    };

    /**
        Create a transform feedback object.

        @method
        @param {VertexArray} vertexArray1 Vertex array containing first set of transform feedback buffers.
        @param {VertexArray} vertexArray2 Vertex array containing second set of transform feedback buffers.
        @param {Array} varryingBufferIndices Locations in the vertex arrays of buffers to use for transform feedback.
    */
    PicoGL.App.prototype.createTransformFeedback = function(vertexArray1, vertexArray2, varyingBufferIndices) {
        return new PicoGL.TransformFeedback(this.gl, vertexArray1, vertexArray2, varyingBufferIndices);
    };

    /**
        Create a vertex buffer.

        @method
        @param {GLEnum} type The data type stored in the vertex buffer.
        @param {number} itemSize Number of elements per vertex.
        @param {ArrayBufferView} data Buffer data.
        @param {GLEnum} [usage=STATIC_DRAW] Buffer usage.
    */
    PicoGL.App.prototype.createVertexBuffer = function(type, itemSize, data, usage) {
        return new PicoGL.VertexBuffer(this.gl, type, itemSize, data, usage);
    };

    /**
        Create an instance buffer. Data items will be per-instance
        rather than per-vertex.

        @method
        @param {GLEnum} type The data type stored in the instance buffer.
        @param {number} itemSize Number of elements per instance.
        @param {ArrayBufferView} data Buffer data.
        @param {GLEnum} [usage=STATIC_DRAW] Buffer usage.
    */
    PicoGL.App.prototype.createInstanceBuffer = function(type, itemSize, data, usage) {
        return new PicoGL.VertexBuffer(this.gl, type, itemSize, data, usage, false, true);
    };

    /**
        Create a per-vertex matrix buffer. Matrix buffers ensure that columns
        are correctly split across attribute locations.

        @method
        @param {GLEnum} type The data type stored in the matrix buffer. Valid types
        are FLOAT_MAT4, FLOAT_MAT3, FLOAT_MAT2.
        @param {ArrayBufferView} data Matrix buffer data.
        @param {GLEnum} [usage=STATIC_DRAW] Buffer usage.
    */
    PicoGL.App.prototype.createVertexMatrixBuffer = function(type, data, usage) {
        return new PicoGL.VertexBuffer(this.gl, type, null, data, usage);
    };

    /**
        Create an instanced matrix buffer. Matrix buffers ensure that columns
        are correctly split across attribute locations. Data items will be per-instance
        rather than per-vertex.

        @method
        @param {GLEnum} type The data type stored in the matrix buffer. Valid types
        are FLOAT_MAT4, FLOAT_MAT3, FLOAT_MAT2.
        @param {ArrayBufferView} data Matrix buffer data.
        @param {GLEnum} [usage=STATIC_DRAW] Buffer usage.
    */
    PicoGL.App.prototype.createInstanceMatrixBuffer = function(type, data, usage) {
        return new PicoGL.VertexBuffer(this.gl, type, null, data, usage, false, true);
    };

    /**
        Create an index buffer.

        @method
        @param {GLEnum} type The data type stored in the index buffer.
        @param {number} itemSize Number of elements per primitive.
        @param {ArrayBufferView} data Index buffer data.
    */
    PicoGL.App.prototype.createIndexBuffer = function(type, itemSize, data) {
        return new PicoGL.VertexBuffer(this.gl, type, itemSize, data, null, true);
    };

    /**
        Create a uniform buffer in std140 layout. NOTE: FLOAT_MAT2, FLOAT_MAT3x2, FLOAT_MAT4x2, 
        FLOAT_MAT3, FLOAT_MAT2x3, FLOAT_MAT4x3 are supported, but must be manually padded to
        4-float column alignment by the application!

        @method
        @param {Array} layout Array indicating the order and types of items to 
                        be stored in the buffer.
        @param {GLEnum} [usage=DYNAMIC_DRAW] Buffer usage.
    */
    PicoGL.App.prototype.createUniformBuffer = function(layout, usage) {
        return new PicoGL.UniformBuffer(this.gl, layout, usage);
    };

    /**
        Create a 2D texture.

        @method
        @param {DOMElement|ArrayBufferView} image Image data. Can be any format that would be accepted 
                by texImage2D. 
        @param {number} [width] Texture width. Required for array data.
        @param {number} [height] Texture height. Required for array data.
        @param {Object} [options] Texture options.
        @param {GLEnum} [options.type=UNSIGNED_BYTE] Type of data stored in the texture.
        @param {GLEnum} [options.format=RGBA] Texture data format.
        @param {GLEnum} [options.internalFormat=RGBA] Texture data internal format.
        @param {boolean} [options.flipY=true] Whether th y-axis be flipped when reading the texture.
        @param {GLEnum} [options.minFilter=LINEAR_MIPMAP_NEAREST] Minification filter.
        @param {GLEnum} [options.magFilter=LINEAR] Magnification filter.
        @param {GLEnum} [options.wrapS=REPEAT] Horizontal wrap mode.
        @param {GLEnum} [options.wrapT=REPEAT] Vertical wrap mode.
        @param {GLEnum} [options.compareMode=NONE] Comparison mode.
        @param {GLEnum} [options.compareFunc=LEQUAL] Comparison function.
        @param {GLEnum} options.baseLevel Base mipmap level. 
        @param {GLEnum} options.maxLevel Maximum mipmap level.
        @param {GLEnum} options.minLOD Mimimum level of detail.
        @param {GLEnum} options.maxLOD Maximum level of detail.
        @param {boolean} [options.generateMipmaps] Should mipmaps be generated.
    */
    PicoGL.App.prototype.createTexture2D = function(image, width, height, options) {
        if (height === undefined) {
            // Passing in a DOM element. Height/width not required.
            options = width;
        }

        return new PicoGL.Texture(this.gl, this.gl.TEXTURE_2D, image, width, height, null, false, options);
    };

    /**
        Create a 2D texture array.

        @method
        @param {ArrayBufferView} image Typed array containing pixel data.
        @param {number} width Texture width.
        @param {number} height Texture height.
        @param {number} size Number of images in the array.
        @param {Object} [options] Texture options.
        @param {GLEnum} [options.type=UNSIGNED_BYTE] Type of data stored in the texture.
        @param {GLEnum} [options.format=RGBA] Texture data format.
        @param {GLEnum} [options.internalFormat=RGBA] Texture data internal format.
        @param {GLEnum} [options.minFilter=LINEAR_MIPMAP_NEAREST] Minification filter.
        @param {GLEnum} [options.magFilter=LINEAR] Magnification filter.
        @param {GLEnum} [options.wrapS=REPEAT] Horizontal wrap mode.
        @param {GLEnum} [options.wrapT=REPEAT] Vertical wrap mode.
        @param {GLEnum} [options.compareMode=NONE] Comparison mode.
        @param {GLEnum} [options.compareFunc=LEQUAL] Comparison function.
        @param {GLEnum} options.baseLevel Base mipmap level. 
        @param {GLEnum} options.maxLevel Maximum mipmap level.
        @param {GLEnum} options.minLOD Mimimum level of detail.
        @param {GLEnum} options.maxLOD Maximum level of detail.
        @param {boolean} [options.generateMipmaps] Should mipmaps be generated.
    */
    PicoGL.App.prototype.createTextureArray = function(image, width, height, depth, options) {
        return new PicoGL.Texture(this.gl, this.gl.TEXTURE_2D_ARRAY, image, width, height, depth, true, options);
    };

    /**
        Create a 3D texture.

        @method
        @param {ArrayBufferView} image Typed array containing pixel data.
        @param {number} width Texture width.
        @param {number} height Texture height.
        @param {number} depth Texture depth.
        @param {Object} [options] Texture options.
        @param {GLEnum} [options.type=UNSIGNED_BYTE] Type of data stored in the texture.
        @param {GLEnum} [options.format=RGBA] Texture data format.
        @param {GLEnum} [options.internalFormat=RGBA] Texture data internal format.
        @param {GLEnum} [options.minFilter=LINEAR_MIPMAP_NEAREST] Minification filter.
        @param {GLEnum} [options.magFilter=LINEAR] Magnification filter.
        @param {GLEnum} [options.wrapS=REPEAT] Horizontal wrap mode.
        @param {GLEnum} [options.wrapT=REPEAT] Vertical wrap mode.
        @param {GLEnum} [options.wrapR=REPEAT] Depth wrap mode.
        @param {GLEnum} [options.compareMode=NONE] Comparison mode.
        @param {GLEnum} [options.compareFunc=LEQUAL] Comparison function.
        @param {GLEnum} options.baseLevel Base mipmap level. 
        @param {GLEnum} options.maxLevel Maximum mipmap level.
        @param {GLEnum} options.minLOD Mimimum level of detail.
        @param {GLEnum} options.maxLOD Maximum level of detail.
        @param {boolean} [options.generateMipmaps] Should mipmaps be generated.
    */
    PicoGL.App.prototype.createTexture3D = function(image, width, height, depth, options) {
        return new PicoGL.Texture(this.gl, this.gl.TEXTURE_3D, image, width, height, depth, true, options);
    };

    /**
        Create a cubemap.

        @method
        @param {Object} options Texture options.
        @param {DOMElement|ArrayBufferView} options.negX The image data for the negative X direction.
                Can be any format that would be accepted by texImage2D.
        @param {DOMElement|ArrayBufferView} options.posX The image data for the positive X direction.
                Can be any format that would be accepted by texImage2D.
        @param {DOMElement|ArrayBufferView} options.negY The image data for the negative Y direction.
                Can be any format that would be accepted by texImage2D.
        @param {DOMElement|ArrayBufferView} options.posY The image data for the positive Y direction.
                Can be any format that would be accepted by texImage2D.
        @param {DOMElement|ArrayBufferView} options.negZ The image data for the negative Z direction.
                Can be any format that would be accepted by texImage2D.
        @param {DOMElement|ArrayBufferView} options.posZ The image data for the positive Z direction.
                Can be any format that would be accepted by texImage2D.
        @param {GLEnum} [options.type=UNSIGNED_BYTE] Type of data stored in the texture.
        @param {GLEnum} [options.format=RGBA] Texture data format.
        @param {GLEnum} [options.internalFormat=RGBA] Texture data internal format.
        @param {number} [options.width] Texture width. Required when passing array data.
        @param {number} [options.height] Texture height. Required when passing array data.
        @param {boolean} [options.flipY=false] Whether th y-axis be flipped when reading the texture.
        @param {GLEnum} [options.minFilter=LINEAR_MIPMAP_NEAREST] Minification filter.
        @param {GLEnum} [options.magFilter=LINEAR] Magnification filter.
        @param {GLEnum} [options.wrapS=REPEAT] Horizontal wrap mode.
        @param {GLEnum} [options.wrapT=REPEAT] Vertical wrap mode.
        @param {boolean} [options.generateMipmaps] Should mipmaps be generated.
    */
    PicoGL.App.prototype.createCubemap = function(options) {
        return new PicoGL.Cubemap(this.gl, options);
    };

    /**
        Create a framebuffer.

        @method
        @param {number} [width=app.width] Width of the framebuffer.
        @param {number} [height=app.height] Height of the framebuffer.
    */
    PicoGL.App.prototype.createFramebuffer = function(width, height) {
        return new PicoGL.Framebuffer(this.gl, width, height);
    };

    /**
        Create a DrawCall. A DrawCall manages the state associated with 
        a WebGL draw call including a program and associated vertex data, textures, 
        uniforms and uniform blocks.

        @method
        @param {Program} program The program to use for this DrawCall.
        @param {VertexArray|TransformFeedback} geometry Vertex data to use for drawing.
        @param {GLEnum} [primitive=TRIANGLES] Type of primitive to draw.
    */
    PicoGL.App.prototype.createDrawCall = function(program, geometry, primitive) {
        return new PicoGL.DrawCall(this.gl, program, geometry, primitive);
    };

    /** 
        Execute the currently attached list of DrawCalls.

        @method
    */
    PicoGL.App.prototype.draw = function() {
        for (var i = 0, len = this.currentDrawCalls.length; i < len; i++) {
            this.currentDrawCalls[i].draw(this.currentState);
        }

        return this;
    };

    /** 
        Start the rendering timer.

        @method
    */
    PicoGL.App.prototype.timerStart = function() {
        this.timer.start();

        return this;
    };

    /** 
        Stop the rendering timer.

        @method
    */
    PicoGL.App.prototype.timerEnd = function() {
        this.timer.end();

        return this;
    };

    /** 
        Check if the rendering time is available. If
        this method returns true, the cpuTime and
        gpuTime properties will be set to valid 
        values.

        @method
    */
    PicoGL.App.prototype.timerReady = function() {
        if (this.timer.ready()) {
            this.cpuTime = this.timer.cpuTime;
            this.gpuTime = this.timer.gpuTime;
            return true;
        } else {
            return false;
        }
    };



})();
