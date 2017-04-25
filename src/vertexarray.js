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
        Storage for vertex data.

        @class
        @prop {WebGLRenderingContext} gl The WebGL context.
        @prop {WebGLVertexArrayObject} vertexArray Vertex array object.
        @prop {array} attributeBuffers The attribute ArrayBuffers associated with this vertex array.
        @prop {number} numElements Number of elements in the vertex array.
        @prop {Glenum} indexType Data type of the indices.
        @prop {boolean} indexed Whether this vertex array is set up for indexed drawing.
        @prop {number} numInstances Number of instances to draw with this vertex array.
    */
    PicoGL.VertexArray = function VertexArray(gl) {
        this.gl = gl;
        this.vertexArray = gl.createVertexArray();
        this.attributeBuffers = [];
        this.numElements = 0;
        this.indexType = null;
        this.indexed = false;
        this.numInstances = 0;
    };

    /**
        Bind an attribute buffer to this vertex array.

        @method
        @param {number} attributeIndex The attribute location to bind to.
        @param {ArrayBuffer} arrayBuffer The ArrayBuffer to bind.
    */
    PicoGL.VertexArray.prototype.attributeBuffer = function(attributeIndex, arrayBuffer) {
        this.gl.bindVertexArray(this.vertexArray);

        this.attributeBuffers[attributeIndex] = arrayBuffer;
        var numRows = arrayBuffer.numRows;
        
        arrayBuffer.bind();

        for (var i = 0; i < numRows; ++i) {
            this.gl.vertexAttribPointer(
                attributeIndex + i, 
                arrayBuffer.itemSize, 
                arrayBuffer.type, 
                false, 
                numRows * arrayBuffer.itemSize * PicoGL.TYPE_SIZE[arrayBuffer.type], 
                i * arrayBuffer.itemSize * PicoGL.TYPE_SIZE[arrayBuffer.type]);

            if (arrayBuffer.instanced) {
                this.gl.vertexAttribDivisor(attributeIndex + i, 1);
            }

            this.gl.enableVertexAttribArray(attributeIndex + i);
        }
        
        this.instanced = this.instanced || arrayBuffer.instanced;

        if (arrayBuffer.instanced) {
            this.numInstances = arrayBuffer.numItems; 
        } else {
            this.numElements = this.numElements || arrayBuffer.numItems; 
        }

        this.gl.bindVertexArray(null);

        return this;
    };

    /**
        Bind an index buffer to this vertex array.

        @method
        @param {ArrayBuffer} arrayBuffer The ArrayBuffer to bind.
    */
    PicoGL.VertexArray.prototype.indexBuffer = function(arrayBuffer) {
        this.gl.bindVertexArray(this.vertexArray);
        arrayBuffer.bind();

        this.numElements = arrayBuffer.numItems * 3;
        this.indexType = arrayBuffer.type;
        this.indexed = true;

        this.gl.bindVertexArray(null);

        return this;
    };

    /**
        Bind this vertex array.

        @method
    */
    PicoGL.VertexArray.prototype.bind = function() {
        this.gl.bindVertexArray(this.vertexArray);

        return this;
    };

    /**
        Unbind this vertex array.

        @method
    */
    PicoGL.VertexArray.prototype.unbind = function() {
        this.gl.bindVertexArray(null);

        return this;
    };

})();
