import torch
import torch.nn as nn

W=10
H=10

class Model(nn.Module):
    def __init__(self):
        super(Model, self).__init__()
        self.conv1 = nn.Conv2d(3, 16, 9, padding=4)
        self.conv2 = nn.Conv2d(16, 32, 9, padding=4)
        self.fc1 = nn.Linear(32*W*H, 512)
        self.fc2 = nn.Linear(512, 64)
        self.fc3 = nn.Linear(64, 4)

    def forward(self, x):
        x = self.conv1(x)
        x = nn.functional.relu(x)
        x = self.conv2(x)
        x = nn.functional.relu(x)
        x = x.view(-1, 32*W*H)
        x = self.fc1(x)
        x = nn.functional.relu(x)
        x = self.fc2(x)
        x = nn.functional.relu(x)
        x = self.fc3(x)
        return x
    

model = Model()
model.load_state_dict(torch.load('./modelgpu.pt', map_location=torch.device('cpu')))
model.eval()
dummy_input = torch.zeros(1, 3, W, H)
output = model(dummy_input)
print(output)
onnx_path = "./model.onnx"
torch.onnx.export(model, dummy_input, onnx_path)
