import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import * as THREE from "three";
import {
  BufferGeometry,
  Mesh,
  MeshBasicMaterial, MeshPhongMaterial,
  Object3DEventMap, PerspectiveCamera,
  Scene, Texture,
  WebGLRenderer
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";


@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
})
export class MainComponent implements AfterViewInit {


  constructor() {
  }

  @ViewChild('threeCanvas')
  private canvasRef!: ElementRef;
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private map!: Mesh<BufferGeometry, MeshPhongMaterial>

  ngAfterViewInit(): void {
    this.createScene();
    requestAnimationFrame((delay) => this.render(delay));
  }

  private createScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvasRef.nativeElement, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1).normalize();
    this.scene.add(directionalLight);

    const controls = new OrbitControls(this.camera, this.canvasRef.nativeElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    const loader = new THREE.TextureLoader();
    loader.load('assets/texture/HeightMap.jpg', (texture) => this.onTextureLoaded(texture));
  }



  private render(delay: DOMHighResTimeStamp) {
    this.renderer.render(this.scene, this.camera)
    requestAnimationFrame((delay) => this.render(delay))

  }

  private generateTerrain(imageData: ImageData) {
    console.log(`imageData -> width: ${imageData.width}, height: ${imageData.height}, data.length: ${imageData.data.length}`);
    console.log(imageData.data);
    const indices: number[] = [];
    const vertices: number[] = [];
    const uvs: number[] = []; // Added UV coordinates
    const colors: number[] = [];
    let yValues: number[] = [];
    let highestY: number = 0;

    for (let z = 0; z < imageData.height; z++) {
      for (let x = 0; x < imageData.width; x++) {
        let y = 0;
        y += imageData.data[(z * imageData.height + x) * 4] / 128;
        y += imageData.data[(z * imageData.height + x + 1) * 4] / 128;
        y += imageData.data[(z * imageData.height + x + 2) * 4] / 128;

        if (isNaN(y)) {
          y = 0;
        }

        if (highestY < y) {
          highestY = y;
        }

        yValues.push(y);
        vertices.push(x, y, z);
        uvs.push(x / (imageData.width - 1), z / (imageData.height - 1)); // Calculate UV coordinates
      }
    }

    yValues.forEach(function (colorval: number) {
      const color = Number((colorval / highestY).toPrecision(3));

      let r = color > 0.8 ? 1 : color > 0.5 ? 200 / 255 : 0;
      let g = color > 0.8 ? 1 : color > 0.5 ? 40 / 255 : 1;
      let b = color > 0.8 ? 1 : color > 0.5 ? 20 / 255 : 0;

      colors.push(r, g, b, 1);
    });

    for (let i = 0; i < imageData.height - 1; i++) {
      for (let j = 0; j < imageData.width - 1; j++) {
        const topLeft = j + i * imageData.width;
        const topRight = j + 1 + i * imageData.width;
        const bottomLeft = j + (i + 1) * imageData.width;
        const bottomRight = j + 1 + (i + 1) * imageData.width;

        // Upper triangles
        indices.push(bottomLeft, topRight, topLeft);
        // Lower triangles
        indices.push(bottomLeft, bottomRight, topRight);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2)); // Set UV coordinates
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial({
      vertexColors: false,
      wireframe: false,
      flatShading: false,
      normalMap: new THREE.TextureLoader().load('assets/texture/NormalMapSample.jpg'),
      map: new THREE.TextureLoader().load('assets/texture/Sample.jpg'),
      side: THREE.DoubleSide,
    });

    this.map = new THREE.Mesh(geometry, material);
    this.scene.add(this.map);
  }


  private onTextureLoaded(texture: Texture) {
    console.log('texture loaded')

    const canvas = document.createElement('canvas');
    canvas.width = texture.image.width;
    canvas.height = texture.image.height;

    const context = canvas.getContext('2d') as CanvasRenderingContext2D;
    context.drawImage(texture.image, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height);

    this.camera.position.x = data.width / 2;
    this.camera.position.y = data.height / 1.5;
    this.camera.position.z = data.width;
    this.camera.lookAt(data.width / 2, 0, data.width / 2);

    this.generateTerrain(data);
  }

}
