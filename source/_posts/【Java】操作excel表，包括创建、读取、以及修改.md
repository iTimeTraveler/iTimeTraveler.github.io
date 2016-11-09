---
title: 【Java】操作excel表，包括创建、读取、以及修改
layout: post
date: 2013-08-01 12:31:20
comments: true
tags: [Java]
categories: [Java]
keywords: Java
description: 
---


作者的网站上对它的特征有如下描述： 

 - 支持Excel 95-2000的所有版本 
 - 生成Excel 2000标准格式 
 - 支持字体、数字、日期操作 
 - 能够修饰单元格属性 
 - 支持图像和图表 

应该说以上功能已经能够大致满足我们的需要。最关键的是这套API是纯Java的，并不依赖Windows系统，即使运行在Linux下，它同样能够正确的处理Excel文件。另外需要说明的是，这套API对图形和图表的支持很有限，而且仅仅识别PNG格式。 


### **搭建环境** 
下载jxl.jar（可以点击[**这里进行下载**](http://download.csdn.net/detail/bonlog/5774137)），放入classpath，安装就完成了。 

<!--more-->


### **基本操作** 
#### **一、创建文件** 
拟生成一个名为“测试数据.xls”的Excel文件，其中第一个工作表被命名为“第一页”。 
代码（CreateXLS.java）： 

```java
//生成Excel的类 
import java.io. * ;
import jxl. * ;
import jxl.write. * ;

public class CreateXLS {
    public static void main(String args[]) {
        try {
            //打开文件 
            WritableWorkbook book = Workbook.createWorkbook(new File(“测试.xls”));
            
            //生成名为“第一页”的工作表，参数0表示这是第一页 
            WritableSheet sheet = book.createSheet(“第一页”, 0);
            
            //在Label对象的构造子中指名单元格位置是第一列第一行(0,0) 
            //以及单元格内容为test 
            Label label = new Label(0, 0, ”test”);
            
            //将定义好的单元格添加到工作表中 
            sheet.addCell(label);
            
            /*生成一个保存数字的单元格, 必须使用Number的完整包路径，否则有语法歧义 
			单元格位置是第二列，第一行，值为789.123*/
            jxl.write.Number number = new jxl.write.Number(1, 0, 789.123);
            sheet.addCell(number);
            
            //写入数据并关闭文件 
            book.write();
            book.close();
        } catch(Exception e) {
            System.out.println(e);
        }
    }
}
```

编译执行后，会在当前位置产生一个Excel文件。 


#### **二、读取文件** 

以刚才我们创建的Excel文件为例，做一个简单的读取操作，程序代码如下： 

```java
//读取Excel的类 
import java.io. * ;
import jxl. * ;

public class ReadXLS {
    public static void main(String args[]) {
        try {
            Workbook book = Workbook.getWorkbook(new File(“测试.xls”));
            //获得第一个工作表对象 
            Sheet sheet = book.getSheet(0);
            //得到第一列第一行的单元格 
            Cell cell1 = sheet.getCell(0, 0);
            String result = cell1.getContents();
            System.out.println(result);
            book.close();
        } catch(Exception e) {
            System.out.println(e);
        }
    }
}
```


#### **三、修改文件** 

利用jExcelAPI可以修改已有的Excel文件，修改Excel文件的时候，除了打开文件的方式不同之外，其他操作和创建Excel是一样的。下面的例子是在我们已经生成的Excel文件中添加一个工作表： 

```java
//修改Excel的类，添加一个工作表 
import java.io.*;
import jxl.*;
import jxl.write.*;

public class UpdateXLS {
    public static void main(String args[]) {
        try {
            //Excel获得文件 
            Workbook wb = Workbook.getWorkbook(new File(“测试.xls”));
            //打开一个文件的副本，并且指定数据写回到原文件 
            WritableWorkbook book = Workbook.createWorkbook(new File(“测试.xls”), wb);
            //添加一个工作表 
            WritableSheet sheet = book.createSheet(“第二页”, 1);
            sheet.addCell(new Label(0, 0, ”第二页的测试数据”));
            book.write();
            book.close();
        } catch(Exception e) {
            System.out.println(e);
        }
    }
}
```


### **高级操作** 

#### **一、 数据格式化** 

在Excel中不涉及复杂的数据类型，能够比较好的处理字串、数字和日期已经能够满足一般的应用。 

1、 字串格式化 
字符串的格式化涉及到的是字体、粗细、字号等元素，这些功能主要由WritableFont和WritableCellFormat类来负责。假设我们在生成一个含有字串的单元格时，使用如下语句，为方便叙述，我们为每一行命令加了编号： 

WritableFont font1= 
new WritableFont(WritableFont.TIMES,16,WritableFont.BOLD); 或//设置字体格式为excel支持的格式 WritableFont font3=new WritableFont(WritableFont.createFont("楷体 _GB2312"),12,WritableFont.NO_BOLD );① WritableCellFormat format1=new WritableCellFormat(font1); ② Label label=new Label(0,0,”data 4 test”,format1) ③ 其中①指定了字串格式：字体为TIMES，字号16，加粗显示。WritableFont有非常丰富的构造子，供不同情况下使用，jExcelAPI的 java-doc中有详细列表，这里不再列出。 ②处代码使用了WritableCellFormat类，这个类非常重要，通过它可以指定单元格的各种属性，后面的单元格格式化中会有更多描述。 ③处使用了Label类的构造子，指定了字串被赋予那种格式。 在WritableCellFormat类中，还有一个很重要的方法是指定数据的对齐方式，比如针对我们上面的实例，可以指定：

```java
//把水平对齐方式指定为居中 
format1.setAlignment(jxl.format.Alignment.CENTRE); 

//把垂直对齐方式指定为居中 
format1.setVerticalAlignment(jxl.format.VerticalAlignment.CENTRE);

//设置自动换行
format1.setWrap(true);
```

#### **二、单元格操作** 

Excel中很重要的一部分是对单元格的操作，比如行高、列宽、单元格合并等，所幸jExcelAPI提供了这些支持。这些操作相对比较简单，下面只介绍一下相关的API。 

1、 合并单元格 

`WritableSheet.mergeCells(int m,int n,int p,int q); `作用是从(m,n)到(p,q)的单元格全部合并，比如： 

```java
WritableSheet sheet=book.createSheet(“第一页”,0); 
//合并第一列第一行到第六列第一行的所有单元格 
sheet.mergeCells(0,0,5,0); 
```

合并既可以是横向的，也可以是纵向的。合并后的单元格不能再次进行合并，否则会触发异常。 

2、 行高和列宽 

`WritableSheet.setRowView(int i,int height); `作用是指定第i+1行的高度，比如： 

```java
//将第一行的高度设为200 
sheet.setRowView(0,200); 
```

`WritableSheet.setColumnView(int i,int width); `作用是指定第i+1列的宽度，比如： 

```java
//将第一列的宽度设为30 
sheet.setColumnView(0,30); 
```

#### **三、操作图片**

```java
public static void write() throws Exception {
    WritableWorkbook wwb = Workbook.createWorkbook(new File("c:/1.xls"));
    WritableSheet ws = wwb.createSheet("Test Sheet 1", 0);
    File file = new File("C:\\jbproject\\PVS\\WebRoot\\weekhit\\1109496996281.png");
    WritableImage image = new WritableImage(1, 4, 6, 18, file);
    ws.addImage(image);
    wwb.write();
    wwb.close();
}
```

很简单和插入单元格的方式一样，不过就是参数多了些，WritableImage这个类继承了Draw，上面只是他构造方法的一种，最后一个参数不用了说 了，前面四个参数的类型都是double，依次是 x, y, width, height,注意，这里的宽和高可不是图片的宽和高，而是图片所要占的单位格的个数，因为继承的Draw所以他的类型必须是double，具体里面怎么 实现的我还没细看：）因为着急赶活，先完成功能，其他的以后有时间慢慢研究。以后会继续写出在使用中的心得给大家。


### **总结**

**1、读**

读的时候是这样的一个思路,先用一个输入流(InputStream)得到Excel文件,然后用jxl中的Workbook得到工作薄,用Sheet从工作薄中得到工作表,用Cell得到工作表中得某个单元格.
InputStream->Workbook->Sheet->Cell,就得到了excel文件中的单元格

```java
String path = "c:\\excel.xls"; //Excel文件URL
InputStream is = new FileInputStream(path); //写入到FileInputStream
jxl.Workbook wb = Workbook.getWorkbook(is); //得到工作薄 
jxl.Sheet st = wb.getSheet(0); //得到工作薄中的第一个工作表
Cell cell = st.getCell(0, 0); //得到工作表的第一个单元格,即A1
String content = cell.getContents(); //getContents()将Cell中的字符转为字符串
wb.close(); //关闭工作薄
is.close(); //关闭输入流

```

我们可以通过`Sheet`的`getCell(x,y)`方法得到任意一个单元格,x,y和excel中的坐标对应.
例如A1对应(0,0),A2对应(0,1),D3对应(3,2).Excel中坐标从A,1开始,jxl中全部是从0开始.
还可以通过`Sheet`的`getRows()`,`getColumns()`方法得到行数列数,并用于循环控制,输出一个sheet中的所有内容.

**2、写**

往Excel中写入内容主要是用jxl.write包中的类.
思路是这样的:
OutputStream<-WritableWorkbook<-WritableSheet<-Label
这里面Label代表的是写入Sheet的Cell位置及内容.

```java
OutputStream os = new FileOutputStream("c:\\test.xls"); 
WritableWorkbook wwb = Workbook.createWorkbook(os); 
WritableSheet ws = wwb.createSheet("sheet1", 0); 	//创建可写工作表
Label labelCF = new Label(0, 0, "hello");	 //创建写入位置和内容
ws.addCell(labelCF); 	//将Label写入sheet中

//Label的构造函数Label(int x, int y,String aString)xy意同读的时候的xy,aString是写入的内容.
WritableFont wf = new WritableFont(WritableFont.TIMES, 12, WritableFont.BOLD, false); 	//设置写入字体
WritableCellFormat wcfF = new WritableCellFormat(wf);	 //设置CellFormat
Label labelCF = new Label(0, 0, "hello"); 	//创建写入位置,内容和格式
//Label的另一构造函数Label(int c, int r, String cont, CellFormat st)可以对写入内容进行格式化,设置字体及其它的属性.
	
wwb.write();
wwb.close();
os.close;
```

OK,只要把读和写结合起来,就可以在N个Excel中读取数据写入你希望的Excel新表中,还是比较方便的.

下面是程序代码:

```java
sql = "select * from tablename";
rs = stmt.executeQuery(sql);

//新建Excel文件
String filePath = request.getRealPath("aaa.xls");
File myFilePath = new File(filePath);
if (!myFilePath.exists()) myFilePath.createNewFile();
FileWriter resultFile = new FileWriter(myFilePath);
PrintWriter myFile = new PrintWriter(resultFile);
resultFile.close();

//用JXL向新建的文件中添加内容
OutputStream outf = new FileOutputStream(filePath);
jxl.write.WritableWorkbook wwb = Workbook.createWorkbook(outf);
jxl.write.WritableSheet ws = wwb.createSheet("sheettest", 0);

int i = 0;
int j = 0;

for (int k = 0; k < rs.getMetaData().getColumnCount(); k++) {
    ws.addCell(new Label(k, 0, rs.getMetaData().getColumnName(k + 1)));
}

while (rs.next()) {
    out.println(rs.getMetaData().getColumnCount());

    for (int k = 0; k < rs.getMetaData().getColumnCount(); k++) {
        ws.addCell(new Label(k, j + i + 1, rs.getString(k + 1)));
    }

    i++;
}
wwb.write();
wwb.close();
} catch(Exception e) {
    e.printStackTrace();
} finally {

    rs.close();
    conn.close();
}

response.sendRedirect("aaa.xls");
```

